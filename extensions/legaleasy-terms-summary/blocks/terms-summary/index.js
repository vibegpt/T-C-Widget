import { registerBlockType } from '@wordpress/blocks';
import { 
    useBlockProps, 
    InspectorControls,
    RichText,
    PanelBody,
    ToggleControl,
    ColorPicker,
    TextControl
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { useState, useEffect } from '@wordpress/element';

registerBlockType('legaleasy/terms-summary', {
    edit: function Edit({ attributes, setAttributes }) {
        const {
            termsText,
            autoDetect,
            showPrompt,
            brandColor,
            brandIcon
        } = attributes;

        const [isAnalyzing, setIsAnalyzing] = useState(false);
        const [analysis, setAnalysis] = useState(null);

        const blockProps = useBlockProps({
            className: 'legaleasy-terms-summary-block'
        });

        const analyzeTerms = async () => {
            if (!termsText.trim()) return;
            
            setIsAnalyzing(true);
            try {
                const response = await fetch(legaleasy_ajax.ajax_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'legaleasy_analyze_terms',
                        nonce: legaleasy_ajax.nonce,
                        terms_text: termsText
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    setAnalysis(data.data);
                }
            } catch (error) {
                console.error('Analysis failed:', error);
            } finally {
                setIsAnalyzing(false);
            }
        };

        return (
            <div {...blockProps}>
                <InspectorControls>
                    <PanelBody title={__('Terms Settings', 'legaleasy-terms-summary')}>
                        <ToggleControl
                            label={__('Auto-detect terms', 'legaleasy-terms-summary')}
                            checked={autoDetect}
                            onChange={(value) => setAttributes({ autoDetect: value })}
                            help={__('Automatically detect terms from page content', 'legaleasy-terms-summary')}
                        />
                        
                        <ToggleControl
                            label={__('Show prompt', 'legaleasy-terms-summary')}
                            checked={showPrompt}
                            onChange={(value) => setAttributes({ showPrompt: value })}
                            help={__('Show the initial prompt to users', 'legaleasy-terms-summary')}
                        />
                    </PanelBody>
                    
                    <PanelBody title={__('Branding', 'legaleasy-terms-summary')}>
                        <ColorPicker
                            color={brandColor}
                            onChangeComplete={(color) => setAttributes({ brandColor: color.hex })}
                            disableAlpha
                        />
                        <TextControl
                            label={__('Brand Icon', 'legaleasy-terms-summary')}
                            value={brandIcon}
                            onChange={(value) => setAttributes({ brandIcon: value })}
                            help={__('Enter an emoji or icon character', 'legaleasy-terms-summary')}
                        />
                    </PanelBody>
                </InspectorControls>

                <div className="legaleasy-block-editor">
                    <h3>{__('Legal Easy Terms Summary', 'legaleasy-terms-summary')}</h3>
                    
                    <div className="legaleasy-terms-input">
                        <label htmlFor="terms-text">
                            {__('Terms Text:', 'legaleasy-terms-summary')}
                        </label>
                        <RichText
                            id="terms-text"
                            tagName="textarea"
                            value={termsText}
                            onChange={(value) => setAttributes({ termsText: value })}
                            placeholder={__('Paste your terms and conditions text here...', 'legaleasy-terms-summary')}
                            className="legaleasy-terms-textarea"
                        />
                    </div>

                    <div className="legaleasy-actions">
                        <button
                            className="button button-primary"
                            onClick={analyzeTerms}
                            disabled={!termsText.trim() || isAnalyzing}
                        >
                            {isAnalyzing ? 
                                __('Analyzing...', 'legaleasy-terms-summary') : 
                                __('Analyze Terms', 'legaleasy-terms-summary')
                            }
                        </button>
                    </div>

                    {analysis && (
                        <div className="legaleasy-analysis-preview">
                            <h4>{__('Analysis Preview:', 'legaleasy-terms-summary')}</h4>
                            <div className="legaleasy-risks">
                                <strong>{__('Detected Risks:', 'legaleasy-terms-summary')}</strong>
                                <ul>
                                    {analysis.risks.map((risk, index) => (
                                        <li key={index}>{risk}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="legaleasy-preview-note">
                        <p>
                            <em>
                                {__('This block will automatically detect and summarize legal terms on the frontend.', 'legaleasy-terms-summary')}
                            </em>
                        </p>
                    </div>
                </div>
            </div>
        );
    },

    save: function Save({ attributes }) {
        const {
            termsText,
            autoDetect,
            showPrompt,
            brandColor,
            brandIcon
        } = attributes;

        const blockProps = useBlockProps.save({
            className: 'legaleasy-terms-summary-block',
            'data-terms-text': termsText,
            'data-auto-detect': autoDetect,
            'data-show-prompt': showPrompt,
            'data-brand-color': brandColor,
            'data-brand-icon': brandIcon
        });

        return (
            <div {...blockProps}>
                <div className="legaleasy-terms-content">
                    {termsText && (
                        <div className="legaleasy-terms-text">
                            {termsText}
                        </div>
                    )}
                </div>
            </div>
        );
    }
});
