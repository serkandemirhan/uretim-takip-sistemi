#!/bin/bash
# Test sync script (Supabase bilgileri olmadan)

echo "Testing sync_to_supabase.sh script..."
echo ""
echo "Supabase bilgileri eksik ama script'in syntax'ını test edelim:"
echo ""

# Export dummy values to test
export SUPABASE_HOST="test.supabase.co"
export SUPABASE_PASS="test_password"

# Run script (will fail at connection but we can see the structure)
bash -n sync_to_supabase.sh && echo "✓ Script syntax is valid!" || echo "✗ Script has syntax errors"
