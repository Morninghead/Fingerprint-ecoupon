const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('fingerprint_templates')
        .select('mdb_user_id, finger_id, template_data, template_size')
        .limit(3);

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log('Templates from Supabase:', data.length);
    data.forEach((t, i) => {
        const buf = Buffer.from(t.template_data, 'base64');
        console.log();
        console.log('Template #' + (i + 1) + ':');
        console.log('  mdb_user_id:', t.mdb_user_id);
        console.log('  Size:', buf.length, '(stored:', t.template_size, ')');
        console.log('  Header:', buf.slice(0, 10).toString('hex'));
    });
}

check().catch(console.error);
