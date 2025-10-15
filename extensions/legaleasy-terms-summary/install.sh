#!/bin/bash

# Legal Easy Terms Summary WordPress Plugin Installation Script

echo "🚀 Installing Legal Easy Terms Summary WordPress Plugin..."

# Check if we're in a WordPress directory
if [ ! -f "wp-config.php" ]; then
    echo "❌ Error: This doesn't appear to be a WordPress installation."
    echo "Please run this script from your WordPress root directory."
    exit 1
fi

# Check if wp-content/plugins directory exists
if [ ! -d "wp-content/plugins" ]; then
    echo "❌ Error: wp-content/plugins directory not found."
    exit 1
fi

# Copy plugin files
echo "📁 Copying plugin files..."
cp -r . "wp-content/plugins/legaleasy-terms-summary/"

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 "wp-content/plugins/legaleasy-terms-summary"
chmod 644 "wp-content/plugins/legaleasy-terms-summary"/*.php
chmod 644 "wp-content/plugins/legaleasy-terms-summary"/*.json
chmod 644 "wp-content/plugins/legaleasy-terms-summary"/*.md
chmod 755 "wp-content/plugins/legaleasy-terms-summary/assets"
chmod 644 "wp-content/plugins/legaleasy-terms-summary/assets"/*
chmod 755 "wp-content/plugins/legaleasy-terms-summary/blocks"
chmod 755 "wp-content/plugins/legaleasy-terms-summary/blocks/terms-summary"
chmod 644 "wp-content/plugins/legaleasy-terms-summary/blocks/terms-summary"/*

# Install npm dependencies if package.json exists
if [ -f "wp-content/plugins/legaleasy-terms-summary/package.json" ]; then
    echo "📦 Installing npm dependencies..."
    cd "wp-content/plugins/legaleasy-terms-summary"
    npm install
    cd - > /dev/null
fi

# Build assets if build script exists
if [ -f "wp-content/plugins/legaleasy-terms-summary/package.json" ] && grep -q "build" "wp-content/plugins/legaleasy-terms-summary/package.json"; then
    echo "🔨 Building assets..."
    cd "wp-content/plugins/legaleasy-terms-summary"
    npm run build
    cd - > /dev/null
fi

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Go to your WordPress admin dashboard"
echo "2. Navigate to Plugins > Installed Plugins"
echo "3. Find 'Legal Easy Terms Summary' and click 'Activate'"
echo "4. Go to 'Legal Easy' in the admin menu to configure settings"
echo ""
echo "For support, visit: https://legaleasy.com"
