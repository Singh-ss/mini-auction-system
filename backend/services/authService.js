const supabase = require('../config/supabase');
const { sendWelcomeEmail } = require('../utils/sendgrid');
const User = require('../models/User');

const signup = async ({ email, password, username }) => {
    const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) throw error;

    await User.create({
        id: user.id,
        username,
        email,
    });

    await sendWelcomeEmail(email, username);
    return user;
};

const login = async ({ email, password }) => {
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;

    return { user, token: session.access_token };
};

module.exports = { signup, login };