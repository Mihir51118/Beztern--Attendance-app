// fetchTables.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fetchTables() {
  try {
    console.log('🔍 Fetching tables from Supabase...');
    
    // Method 1: Try to get tables using RPC function (most reliable)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_public_tables');
    
    if (!rpcError && rpcData) {
      console.log('✅ Tables found using RPC:');
      rpcData.forEach((table) => {
        console.log(`- ${table.table_name}`);
      });
      return;
    }

    // Method 2: Try direct query to information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Information schema query failed:', error.message);
      
      // Method 3: Try known tables directly
      console.log('🔄 Trying to check known tables...');
      await checkKnownTables();
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Tables in public schema:');
      data.forEach((table) => {
        console.log(`- ${table.table_name}`);
      });
    } else {
      console.log('⚠️ No tables found in public schema');
      await checkKnownTables();
    }
    
  } catch (err) {
    console.error('💥 Error fetching tables:', err);
    await checkKnownTables();
  }
}

// Fallback function to check known tables
async function checkKnownTables() {
  const knownTables = ['profiles', 'attendance', 'shop_visits'];
  
  console.log('🔍 Checking known tables:');
  
  for (const tableName of knownTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ ${tableName} - exists (${data?.length || 0} sample records)`);
      } else {
        console.log(`❌ ${tableName} - ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ ${tableName} - ${err.message}`);
    }
  }
}

// Enhanced function to also check table structures
async function checkTableStructures() {
  const tables = ['profiles', 'attendance', 'shop_visits'];
  
  console.log('\n📊 Checking table structures:');
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`\n📋 ${tableName} columns:`);
        Object.keys(data[0]).forEach(column => {
          console.log(`  - ${column}: ${typeof data[0][column]}`);
        });
      } else if (!error) {
        console.log(`\n📋 ${tableName}: Table exists but no data`);
      }
    } catch (err) {
      console.log(`\n❌ ${tableName}: ${err.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Supabase table analysis...\n');
  
  // Check connection
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('⚠️ Auth check failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful\n');
    }
  } catch (err) {
    console.log('⚠️ Connection test failed:', err.message);
  }
  
  // Fetch tables
  await fetchTables();
  
  // Check table structures
  await checkTableStructures();
  
  console.log('\n🏁 Analysis complete!');
}

main().catch(console.error);
