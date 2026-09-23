export const POLICY_DESCRIPTION='Independent seller policy facts for purchasing agents. Extract return windows, fees, shipping terms, warranty terms and legal clauses with source excerpts and provenance. Returns an Ed25519-signed assessment; the calling agent makes the purchase decision. Use seller_url for policy discovery, url for one policy page, or text for supplied content.';
export const INPUT_PROPERTIES={
  url:{type:'string',format:'uri',description:'Fetch exactly this policy page URL'},
  seller_url:{type:'string',format:'uri',description:'Discover policies from this seller homepage'},
  sellerUrl:{type:'string',format:'uri',description:'Compatibility alias for seller_url'},
  text:{type:'string',minLength:50,maxLength:100000,description:'Raw policy text, including any embedded hyperlinks'},
};
export const INPUT_SCHEMA={type:'object',properties:INPUT_PROPERTIES,anyOf:[{required:['url']},{required:['seller_url']},{required:['sellerUrl']},{required:['text']}]};
export const OUTPUT_EXAMPLE={
  payment:{settled:true,transaction:'0xEXAMPLE',network:'eip155:8453',payer:'0xEXAMPLE'},
  analysis:{
    analysis_status:'text_provided',confidence:'medium',fetch_method:'client_provided',
    policies:{returns:{facts:{window_days:30},evidence:{window_days:{source_id:'source_1',quote:'Items may be returned within 30 days of delivery.'}},summary:'1 evidence-backed returns fact(s) extracted.'}},
    clauses:[],flags:[],positives:[],
    signed_assessment:{version:'2.1',provider:'policycheck.tools',assessment_id:'example-assessment-id',timestamp:'2026-09-23T00:00:00.000Z',expires_at:'2026-09-23T00:05:00.000Z',fetch_method:'client_provided',sources:[{id:'source_1',url:null,acquisition:'client_provided',content_hash:'sha256:EXAMPLE'}],limitations:['Caller-supplied content is not independently retrieved.']},
    signature:'EXAMPLE_NOT_A_VALID_SIGNATURE',signed_payload_hash:'sha256:EXAMPLE',jwks_url:'https://policycheck.tools/.well-known/jwks.json',verification_url:'https://policycheck.tools/api/v1/verify',
  },
};
