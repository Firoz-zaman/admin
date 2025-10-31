const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    // Create admin client - service role bypasses RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, check if user exists (for debugging)
    const { data: checkData, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (checkError) {
      return res.status(500).json({ 
        error: `Database error: ${checkError.message}`,
        hint: checkError.hint 
      });
    }

    if (!checkData) {
      return res.status(404).json({ 
        error: `No user found with email: ${email}` 
      });
    }

    // User exists, now update
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', email.toLowerCase().trim())
      .select();

    if (error) {
      return res.status(500).json({ 
        error: error.message,
        hint: error.hint 
      });
    }

    if (!data || data.length === 0) {
      return res.status(500).json({ 
        error: 'Update failed - no rows affected' 
      });
    }

    return res.status(200).json({ 
      message: `✓ ${email} is now admin!`,
      updated: data[0]
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
};
