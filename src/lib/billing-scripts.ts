// Each transition is one Redis transaction. Never perform a balance read/modify/write in JS.
// Accounts, idempotency records, and receipts share the account's Redis hash tag.
export const RESERVE = `
local account, request, pending, ledger = KEYS[1], KEYS[2], KEYS[3], KEYS[4]
if redis.call('HGET',account,'status') ~= 'active' then return {'inactive'} end
local now = tonumber(ARGV[1])
-- Recover abandoned reservations before admitting new work. Pending records have no TTL.
local expired = redis.call('ZRANGEBYSCORE',pending,'-inf',now,'LIMIT',0,100)
for _, key in ipairs(expired) do
  local raw = redis.call('GET',key)
  if raw then
    local old = cjson.decode(raw)
    if old.state == 'pending' then
      redis.call('HINCRBY',account,'balance',old.price)
      redis.call('HINCRBY',account,'reserved',-old.price)
      old.state = 'expired'
      redis.call('SET',key,cjson.encode(old),'EX',86400)
      redis.call('XADD',ledger,'*','type','release','request',key,'amount',old.price,'reason','lease_expired')
    end
  end
  redis.call('ZREM',pending,key)
end
local raw = redis.call('GET',request)
if raw then
  local old = cjson.decode(raw)
  if old.fingerprint ~= ARGV[2] then return {'conflict'} end
  if old.state == 'complete' then return {'replay',raw} end
  if old.state == 'pending' then return {'in_progress'} end
end
local price = tonumber(ARGV[4])
if tonumber(redis.call('HGET',account,'balance') or '0') < price then return {'insufficient'} end
if redis.call('ZCARD',pending) >= 5 then return {'busy'} end
-- Include failures in the rate budget so funded clients cannot run unlimited no-fact requests.
local rate = redis.call('HGET',account,'rate_window')
if rate ~= ARGV[6] then redis.call('HSET',account,'rate_window',ARGV[6],'rate_count',0) end
if tonumber(redis.call('HGET',account,'rate_count') or '0') >= 60 then return {'rate_limited'} end
redis.call('HINCRBY',account,'rate_count',1)
redis.call('HINCRBY',account,'balance',-price)
redis.call('HINCRBY',account,'reserved',price)
local entry = {state='pending',fingerprint=ARGV[2],token=ARGV[3],price=price}
redis.call('SET',request,cjson.encode(entry))
redis.call('ZADD',pending,ARGV[5],request)
redis.call('XADD',ledger,'*','type','reserve','request',request,'amount',price)
return {'reserved'}
`;

export const FINISH = `
local raw = redis.call('GET',KEYS[2])
if not raw then return {'lost'} end
local entry = cjson.decode(raw)
if entry.state == 'complete' and entry.token == ARGV[1] then return {'complete',raw} end
if entry.state ~= 'pending' or entry.token ~= ARGV[1] then return {'lost'} end
local deadline = tonumber(redis.call('ZSCORE',KEYS[3],KEYS[2]) or '0')
local commit = ARGV[2]=='commit' and deadline > tonumber(ARGV[4]) and redis.call('HGET',KEYS[1],'status')=='active'
redis.call('HINCRBY',KEYS[1],'reserved',-entry.price)
if commit then
  redis.call('HINCRBY',KEYS[1],'spent',entry.price)
  redis.call('HINCRBY',KEYS[1],'successful_requests',1)
  entry.state='complete'; entry.response=ARGV[3]
else
  redis.call('HINCRBY',KEYS[1],'balance',entry.price)
  entry.state='released'
end
redis.call('SET',KEYS[2],cjson.encode(entry),'EX',86400)
redis.call('ZREM',KEYS[3],KEYS[2])
redis.call('XADD',KEYS[4],'*','type',commit and 'charge' or 'release','request',KEYS[2],'amount',entry.price)
return {commit and 'complete' or 'released'}
`;

export const CREATE_ACCOUNT = `
if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[2])==1 then return 0 end
redis.call('HSET',KEYS[1],'status','active','balance',0,'reserved',0,'spent',0,'successful_requests',0,'created_at',ARGV[2])
redis.call('SET',KEYS[2],ARGV[1])
return 1
`;

export const CREDIT = `
if redis.call('EXISTS',KEYS[1])==0 then return {'missing_account'} end
if redis.call('EXISTS',KEYS[2])==1 then return {'duplicate'} end
local intent = redis.call('GET',KEYS[4])
if intent and intent ~= ARGV[3] then return {'conflict'} end
redis.call('SET',KEYS[4],ARGV[3])
-- A refund/dispute can arrive before its checkout completion event.
if redis.call('EXISTS',KEYS[5])==1 then
  redis.call('HSET',KEYS[1],'status','suspended')
  redis.call('SET',KEYS[2],'blocked')
  redis.call('XADD',KEYS[3],'*','type','blocked_credit','payment',ARGV[2],'amount',ARGV[1])
  return {'blocked'}
end
redis.call('HINCRBY',KEYS[1],'balance',ARGV[1])
redis.call('SET',KEYS[2],ARGV[3])
redis.call('XADD',KEYS[3],'*','type','credit','payment',ARGV[2],'amount',ARGV[1])
return {'credited'}
`;

export const SUSPEND_PAYMENT = `
-- Permanent marker prevents late completion from restoring refunded/disputed funds.
redis.call('SET',KEYS[1],ARGV[1])
local account = redis.call('GET',KEYS[2])
if account then
  redis.call('HSET','billing:{'..account..'}:account','status','suspended')
end
return account or ''
`;
