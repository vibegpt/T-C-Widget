<?php
/**
 * Plugin Name: Legal Easy Terms Summary
 * Plugin URI: https://legaleasy.com
 * Description: Automatically detect and summarize legal terms on your WordPress site with AI-powered analysis.
 * Version: 1.0.0
 * Author: Legal Easy
 * License: GPL v2 or later
 * Text Domain: legaleasy-terms-summary
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('LEGALEASY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('LEGALEASY_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('LEGALEASY_VERSION', '1.0.0');

/**
 * Main Legal Easy Terms Summary class
 */
class LegalEasyTermsSummary {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_ajax_legaleasy_analyze_terms', array($this, 'ajax_analyze_terms'));
        add_action('wp_ajax_nopriv_legaleasy_analyze_terms', array($this, 'ajax_analyze_terms'));
        
        // Register Gutenberg blocks
        add_action('init', array($this, 'register_blocks'));
    }
    
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('legaleasy-terms-summary', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function enqueue_scripts() {
        // Enqueue the Legal Easy embed script
        wp_enqueue_script(
            'legaleasy-embed',
            LEGALEASY_PLUGIN_URL . 'assets/legaleasy-embed.js',
            array(),
            LEGALEASY_VERSION,
            true
        );
        
        // Add container div and configuration
        wp_add_inline_script('legaleasy-embed', $this->get_container_and_config(), 'before');
    }
    
    public function admin_enqueue_scripts($hook) {
        if ($hook !== 'toplevel_page_legaleasy-settings') {
            return;
        }
        
        wp_enqueue_script(
            'legaleasy-admin',
            LEGALEASY_PLUGIN_URL . 'assets/admin.js',
            array('jquery'),
            LEGALEASY_VERSION,
            true
        );
        
        wp_localize_script('legaleasy-admin', 'legaleasy_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('legaleasy_nonce')
        ));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Legal Easy Settings', 'legaleasy-terms-summary'),
            __('Legal Easy', 'legaleasy-terms-summary'),
            'manage_options',
            'legaleasy-settings',
            array($this, 'admin_page'),
            'dashicons-shield-alt',
            30
        );
    }
    
    public function admin_page() {
        $api_key = get_option('legaleasy_api_key', '');
        $auto_detect = get_option('legaleasy_auto_detect', true);
        $brand_color = get_option('legaleasy_brand_color', '#00B3A6');
        $brand_icon = get_option('legaleasy_brand_icon', '◆');
        ?>
        <div class="wrap">
            <h1><?php _e('Legal Easy Settings', 'legaleasy-terms-summary'); ?></h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('legaleasy_settings');
                do_settings_sections('legaleasy_settings');
                ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_api_key"><?php _e('API Key', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="legaleasy_api_key" name="legaleasy_api_key" 
                                   value="<?php echo esc_attr($api_key); ?>" class="regular-text" />
                            <p class="description">
                                <?php _e('Enter your Legal Easy API key to enable terms analysis.', 'legaleasy-terms-summary'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_auto_detect"><?php _e('Auto-Detection', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" id="legaleasy_auto_detect" name="legaleasy_auto_detect" 
                                   value="1" <?php checked($auto_detect); ?> />
                            <label for="legaleasy_auto_detect">
                                <?php _e('Automatically detect terms and conditions on pages', 'legaleasy-terms-summary'); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_brand_color"><?php _e('Brand Color', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="color" id="legaleasy_brand_color" name="legaleasy_brand_color" 
                                   value="<?php echo esc_attr($brand_color); ?>" />
                            <p class="description">
                                <?php _e('Choose the primary color for Legal Easy widgets.', 'legaleasy-terms-summary'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_brand_icon"><?php _e('Brand Icon', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="legaleasy_brand_icon" name="legaleasy_brand_icon" 
                                   value="<?php echo esc_attr($brand_icon); ?>" class="regular-text" />
                            <p class="description">
                                <?php _e('Enter an emoji or icon character for Legal Easy branding.', 'legaleasy-terms-summary'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_terms_selectors"><?php _e('Terms Selectors', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="legaleasy_terms_selectors" name="legaleasy_terms_selectors" 
                                   value="<?php echo esc_attr(get_option('legaleasy_terms_selectors', '#terms, .terms, [data-terms], [aria-label*="terms" i]')); ?>" class="large-text" />
                            <p class="description">
                                <?php _e('CSS selectors to find terms content (comma-separated).', 'legaleasy-terms-summary'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="legaleasy_agree_selectors"><?php _e('Agree Button Selectors', 'legaleasy-terms-summary'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="legaleasy_agree_selectors" name="legaleasy_agree_selectors" 
                                   value="<?php echo esc_attr(get_option('legaleasy_agree_selectors', 'button, [role="button"], input[type="submit"], [name*="agree" i], [id*="agree" i]')); ?>" class="large-text" />
                            <p class="description">
                                <?php _e('CSS selectors to find agree buttons (comma-separated).', 'legaleasy-terms-summary'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <div class="legaleasy-test-section">
                <h2><?php _e('Test Terms Analysis', 'legaleasy-terms-summary'); ?></h2>
                <p><?php _e('Paste some terms text below to test the analysis:', 'legaleasy-terms-summary'); ?></p>
                <textarea id="legaleasy-test-text" rows="10" cols="80" placeholder="<?php _e('Paste terms text here...', 'legaleasy-terms-summary'); ?>"></textarea>
                <br><br>
                <button id="legaleasy-test-button" class="button button-primary">
                    <?php _e('Analyze Terms', 'legaleasy-terms-summary'); ?>
                </button>
                <div id="legaleasy-test-results" style="margin-top: 20px;"></div>
            </div>
        </div>
        <?php
    }
    
    public function register_blocks() {
        // Register the Terms Summary block
        register_block_type(LEGALEASY_PLUGIN_PATH . 'blocks/terms-summary', array(
            'render_callback' => array($this, 'render_terms_summary_block'),
            'attributes' => array(
                'termsText' => array(
                    'type' => 'string',
                    'default' => ''
                ),
                'autoDetect' => array(
                    'type' => 'boolean',
                    'default' => true
                ),
                'showPrompt' => array(
                    'type' => 'boolean',
                    'default' => true
                )
            )
        ));
    }
    
    public function render_terms_summary_block($attributes) {
        $terms_text = $attributes['termsText'];
        $auto_detect = $attributes['autoDetect'];
        $show_prompt = $attributes['showPrompt'];
        
        if (empty($terms_text) && $auto_detect) {
            // Auto-detect terms from page content
            $terms_text = $this->detect_terms_from_content();
        }
        
        if (empty($terms_text)) {
            return '<div class="legaleasy-no-terms">' . 
                   __('No terms detected. Please add terms text or enable auto-detection.', 'legaleasy-terms-summary') . 
                   '</div>';
        }
        
        $block_id = 'legaleasy-block-' . uniqid();
        
        return sprintf(
            '<div id="%s" class="legaleasy-terms-block" data-terms-text="%s" data-show-prompt="%s">
                %s
            </div>',
            esc_attr($block_id),
            esc_attr($terms_text),
            esc_attr($show_prompt ? 'true' : 'false'),
            $show_prompt ? '' : $this->render_terms_summary($terms_text)
        );
    }
    
    public function ajax_analyze_terms() {
        check_ajax_referer('legaleasy_nonce', 'nonce');
        
        $terms_text = sanitize_textarea_field($_POST['terms_text']);
        
        if (empty($terms_text)) {
            wp_send_json_error('No terms text provided');
        }
        
        // Here you would call your Legal Easy API
        // For now, we'll return a mock response
        $analysis = $this->analyze_terms_locally($terms_text);
        
        wp_send_json_success($analysis);
    }
    
    private function get_container_and_config() {
        $brand_color = get_option('legaleasy_brand_color', '#00B3A6');
        $brand_icon = get_option('legaleasy_brand_icon', '◆');
        $terms_selectors = get_option('legaleasy_terms_selectors', '#terms, .terms, [data-terms], [aria-label*="terms" i]');
        $agree_selectors = get_option('legaleasy_agree_selectors', 'button, [role="button"], input[type="submit"], [name*="agree" i], [id*="agree" i]');
        
        return sprintf(
            '// Create container div if it doesn\'t exist
            if (!document.getElementById("legaleasy-embed-root")) {
                const container = document.createElement("div");
                container.id = "legaleasy-embed-root";
                container.dataset.leBrandColor = "%s";
                container.dataset.leBrandIcon = "%s";
                container.dataset.leTermsSelectors = "%s";
                container.dataset.leAgreeSelectors = "%s";
                document.body.appendChild(container);
            }',
            esc_js($brand_color),
            esc_js($brand_icon),
            esc_js($terms_selectors),
            esc_js($agree_selectors)
        );
    }
    
    private function detect_terms_from_content() {
        global $post;
        
        if (!$post) {
            return '';
        }
        
        $content = $post->post_content;
        
        // Look for common terms patterns
        $patterns = array(
            '/<h[1-6][^>]*>.*?(?:terms?|conditions?|agreement|policy).*?<\/h[1-6]>/i',
            '/<div[^>]*class="[^"]*terms[^"]*"[^>]*>.*?<\/div>/is',
            '/<section[^>]*id="[^"]*terms[^"]*"[^>]*>.*?<\/section>/is'
        );
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content, $matches)) {
                return strip_tags($matches[0]);
            }
        }
        
        return '';
    }
    
    private function analyze_terms_locally($terms_text) {
        // This is a simplified local analysis
        // In production, you'd call your Legal Easy API
        
        $risks = array();
        $sections = array();
        
        // Basic pattern matching
        if (stripos($terms_text, 'arbitration') !== false) {
            $risks[] = 'arbitration';
        }
        
        if (stripos($terms_text, 'class action') !== false) {
            $risks[] = 'class_action_waiver';
        }
        
        if (preg_match('/\$(\d+)/', $terms_text, $matches)) {
            $risks[] = 'liability_cap_' . $matches[1];
        }
        
        return array(
            'risks' => $risks,
            'sections' => $sections,
            'summary' => 'Terms analysis completed locally.'
        );
    }
    
    private function render_terms_summary($terms_text) {
        // This would render the actual terms summary
        return '<div class="legaleasy-summary">Terms summary would appear here.</div>';
    }
}

// Initialize the plugin
new LegalEasyTermsSummary();

// Register settings
add_action('admin_init', function() {
    register_setting('legaleasy_settings', 'legaleasy_api_key');
    register_setting('legaleasy_settings', 'legaleasy_auto_detect');
    register_setting('legaleasy_settings', 'legaleasy_brand_color');
    register_setting('legaleasy_settings', 'legaleasy_brand_icon');
    register_setting('legaleasy_settings', 'legaleasy_terms_selectors');
    register_setting('legaleasy_settings', 'legaleasy_agree_selectors');
});
