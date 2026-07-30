const { supabase } = require('./DbConnect')

const TABLE_NAME = 'Expense'


// Creates ONE expense row.
async function createExpenseByUserID (payload) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select()

  if (error) {
    throw error
  }

  return data
}

// Fetches ONE expense row by its own primary key.
// (Named "ByUserID" in the original, but .eq('id', id) matches the row's own id — kept as-is for now.)
async function getExpenseByID (id) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Fetches ALL expense rows belonging to a given user.
async function getExpensesByUserID (userId) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('User_ID', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Updates ONE expense row by its own primary key.
// `updates` is a partial object, e.g. { site, category, amount, notes }.
async function updateExpenseByID (id, userId, updates) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('User_ID', userId) // <-- ensures you can only update your own entries
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

module.exports = {
  createExpenseByUserID,
  getExpenseByID,
  getExpensesByUserID,
  updateExpenseByID
}
