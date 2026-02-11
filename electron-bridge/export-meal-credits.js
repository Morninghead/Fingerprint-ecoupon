const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    'https://ojpiwbsxuocflmxxdpwb.supabase.co',
    'sb_publishable_jtrGs2PPWsvKqd5_BGzCXQ_gplKPAIL'
);

async function exportCredits() {
    const date = process.argv[2] || new Date().toISOString().split('T')[0];

    console.log('📋 กำลังดึงรายชื่อพนักงานที่มีสิทธิ์ meal credit วันที่', date);

    // ดึงทั้งหมด
    const { data, error, count } = await supabase
        .from('meal_credits')
        .select('employee_id, lunch_available, ot_meal_available, employees(name, pin)', { count: 'exact' })
        .eq('date', date)
        .order('employees(pin)', { ascending: true });

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    // สร้าง CSV
    let csv = 'No,PIN,Name,Lunch,OT_Meal\n';
    data?.forEach((item, i) => {
        const emp = item.employees;
        const lunch = item.lunch_available ? 'Yes' : 'No';
        const ot = item.ot_meal_available ? 'Yes' : 'No';
        const name = (emp?.name || '-').replace(/"/g, '""');
        const pin = emp?.pin || '-';
        csv += `${i + 1},${pin},"${name}",${lunch},${ot}\n`;
    });

    const filename = `meal_credits_${date}.csv`;
    fs.writeFileSync(filename, '\uFEFF' + csv, 'utf-8'); // BOM for Thai chars

    console.log('✅ บันทึกไฟล์:', filename);
    console.log('📊 รวม:', count, 'รายการ');
    console.log('📂 ที่:', process.cwd() + '\\' + filename);

    // สรุป
    const lunchCount = data?.filter(d => d.lunch_available).length || 0;
    const otCount = data?.filter(d => d.ot_meal_available).length || 0;
    console.log('\n📊 สรุป:');
    console.log('   - มีสิทธิ์ Lunch:', lunchCount, 'คน');
    console.log('   - มีสิทธิ์ OT Meal:', otCount, 'คน');
}

exportCredits().catch(console.error);
