jQuery(document).ready(function($) {
    'use strict';
    
    // Test terms analysis functionality
    $('#legaleasy-test-button').on('click', function(e) {
        e.preventDefault();
        
        const $button = $(this);
        const $results = $('#legaleasy-test-results');
        const termsText = $('#legaleasy-test-text').val().trim();
        
        if (!termsText) {
            $results.html('<div class="notice notice-error"><p>Please enter some terms text to analyze.</p></div>');
            return;
        }
        
        $button.prop('disabled', true).text('Analyzing...');
        $results.html('<div class="notice notice-info"><p>Analyzing terms...</p></div>');
        
        $.ajax({
            url: legaleasy_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'legaleasy_analyze_terms',
                nonce: legaleasy_ajax.nonce,
                terms_text: termsText
            },
            success: function(response) {
                if (response.success) {
                    displayAnalysisResults($results, response.data);
                } else {
                    $results.html('<div class="notice notice-error"><p>Analysis failed: ' + response.data + '</p></div>');
                }
            },
            error: function(xhr, status, error) {
                $results.html('<div class="notice notice-error"><p>Request failed: ' + error + '</p></div>');
            },
            complete: function() {
                $button.prop('disabled', false).text('Analyze Terms');
            }
        });
    });
    
    function displayAnalysisResults($container, analysis) {
        let html = '<div class="notice notice-success"><p><strong>Analysis Complete!</strong></p></div>';
        
        if (analysis.risks && analysis.risks.length > 0) {
            html += '<div class="legaleasy-analysis-results">';
            html += '<h3>Detected Risks:</h3>';
            html += '<ul>';
            analysis.risks.forEach(function(risk) {
                html += '<li>' + escapeHtml(risk) + '</li>';
            });
            html += '</ul>';
            html += '</div>';
        }
        
        if (analysis.sections && analysis.sections.length > 0) {
            html += '<div class="legaleasy-analysis-sections">';
            html += '<h3>Detected Sections:</h3>';
            html += '<ul>';
            analysis.sections.forEach(function(section) {
                html += '<li>' + escapeHtml(section) + '</li>';
            });
            html += '</ul>';
            html += '</div>';
        }
        
        if (analysis.summary) {
            html += '<div class="legaleasy-analysis-summary">';
            html += '<h3>Summary:</h3>';
            html += '<p>' + escapeHtml(analysis.summary) + '</p>';
            html += '</div>';
        }
        
        $container.html(html);
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // Settings form validation
    $('form[action="options.php"]').on('submit', function(e) {
        const apiKey = $('#legaleasy_api_key').val().trim();
        const brandColor = $('#legaleasy_brand_color').val();
        const brandIcon = $('#legaleasy_brand_icon').val().trim();
        
        let errors = [];
        
        if (!apiKey) {
            errors.push('API Key is required');
        }
        
        if (!brandColor) {
            errors.push('Brand Color is required');
        }
        
        if (!brandIcon) {
            errors.push('Brand Icon is required');
        }
        
        if (errors.length > 0) {
            e.preventDefault();
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return false;
        }
    });
    
    // Color picker enhancement
    $('#legaleasy_brand_color').on('change', function() {
        const color = $(this).val();
        $(this).css('background-color', color);
    }).trigger('change');
    
    // Brand icon preview
    $('#legaleasy_brand_icon').on('input', function() {
        const icon = $(this).val();
        const $preview = $('#brand-icon-preview');
        
        if ($preview.length === 0) {
            $(this).after('<div id="brand-icon-preview" style="margin-top: 5px; font-size: 24px;"></div>');
        }
        
        $('#brand-icon-preview').text(icon || '◆');
    }).trigger('input');
    
    // Auto-detect toggle behavior
    $('#legaleasy_auto_detect').on('change', function() {
        const isEnabled = $(this).is(':checked');
        const $note = $('#auto-detect-note');
        
        if ($note.length === 0) {
            $(this).closest('td').append('<p id="auto-detect-note" class="description" style="margin-top: 5px;"></p>');
        }
        
        if (isEnabled) {
            $note.text('Legal Easy will automatically scan pages for terms and conditions.');
        } else {
            $note.text('You will need to manually add the Terms Summary block to pages.');
        }
    }).trigger('change');
});
