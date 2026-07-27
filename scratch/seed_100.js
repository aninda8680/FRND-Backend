/**
 * Comprehensive 100 Profile Seed Script — College Dating App
 * Usage: node scratch/seed_100.js
 */

const path = require('path');
const API_DIR = path.join(__dirname, '..', 'api');

require(path.join(API_DIR, 'node_modules', 'dotenv')).config({ path: path.join(API_DIR, '.env') });
process.chdir(API_DIR);

const mongoose = require(path.join(API_DIR, 'node_modules', 'mongoose'));
const bcrypt   = require(path.join(API_DIR, 'node_modules', 'bcryptjs'));

// Models
const User = require('../api/models/User');
const Admin = require('../api/models/Admin');
const Like = require('../api/models/Like');
const Dislike = require('../api/models/Dislike');
const Match = require('../api/models/Match');
const Block = require('../api/models/Block');
const Report = require('../api/models/Report');
const AccountFlag = require('../api/models/AccountFlag');
const AnonymousPost = require('../api/models/AnonymousPost');
const Feedback = require('../api/models/Feedback');
const Announcement = require('../api/models/Announcement');
const AdminAction = require('../api/models/AdminAction');
const EmailVerification = require('../api/models/EmailVerification');
const IdentityVerificationRequest = require('../api/models/IdentityVerificationRequest');
const Payment = require('../api/models/Payment');

const USER_PASSWORD = 'Password@123';
const ADMIN_PASSWORD = 'AdminSecure@2026';
const COMMON_PASS    = 'common-admin-secret-password-123';

const MALE_NAMES = [
  'Arjun', 'Dev', 'Rahul', 'Aman', 'Sahil', 'Rohan', 'Aditya', 'Vikram', 'Kunal', 'Kabir',
  'Siddharth', 'Yash', 'Harsh', 'Varun', 'Ishan', 'Sameer', 'Rupam', 'Subhajit', 'Sourav', 'Pritam',
  'Anirban', 'Debabrata', 'Sayan', 'Avik', 'Koustav', 'Neil', 'Aarav', 'Vivaan', 'Vihaan', 'Reyansh',
  'Shivansh', 'Atharva', 'Dhruv', 'Kian', 'Ahaan', 'Shreyas', 'Parth', 'Om', 'Pranav', 'Tanmay',
  'Tanishq', 'Rishabh', 'Utkarsh', 'Ayush', 'Kartik', 'Mayank', 'Chirag', 'Naman', 'Hardik', 'Lakshay'
];

const FEMALE_NAMES = [
  'Priya', 'Sneha', 'Ananya', 'Pooja', 'Nisha', 'Riya', 'Diya', 'Kavya', 'Ishita', 'Shreya',
  'Meera', 'Aditi', 'Tanvi', 'Anushka', 'Neha', 'Swati', 'Payal', 'Moumita', 'Sreeja', 'Dipanwita',
  'Sayani', 'Ankita', 'Tiyasa', 'Trisha', 'Aadhya', 'Anika', 'Avani', 'Navya', 'Myra', 'Pari',
  'Saanvi', 'Samaira', 'Shanaya', 'Siya', 'Vanya', 'Vedika', 'Yashvi', 'Aaradhya', 'Ahana', 'Amaira',
  'Anvi', 'Ira', 'Juhi', 'Kriti', 'Mahika', 'Natasha', 'Nitya', 'Radhika', 'Riddhi', 'Simran'
];

const LAST_NAMES = [
  'Sharma', 'Dey', 'Biswas', 'Roy', 'Ghosh', 'Kapoor', 'Verma', 'Nair', 'Das', 'Joshi',
  'Sengupta', 'Banerjee', 'Mukhopadhyay', 'Ganguly', 'Bhattacharya', 'Chatterjee', 'Dutta', 'Paul', 'Sarkar', 'Chakraborty',
  'Maiti', 'Pal', 'Bose', 'Bhowmick', 'Seal', 'Chaudhuri', 'Basu', 'Ray', 'Samanta', 'Mondal'
];

const COURSES = [
  'B.Tech CSE', 'BCA', 'MCA', 'B.Tech ECE', 'B.Tech Mechanical', 'B.Tech Civil', 'BBA', 'MBA',
  'BSc Physics', 'BSc Chemistry', 'BSc Maths', 'BA English', 'B.Pharm', 'Biotechnology', 'BA LLB', 'B.Des'
];

const HOBBIES_LIST = [
  'Coding', 'Chess', 'Gaming', 'Painting', 'Reading', 'Cooking', 'Robotics', 'Cycling', 'Business',
  'Travel', 'Photography', 'Gym', 'Football', 'Memes', 'Astronomy', 'Anime', 'Cricket', 'Investing',
  'Writing', 'Theatre', 'Machine Learning', 'Badminton', 'Music', 'UI Design', 'Dancing', 'Singing', 'Video Editing'
];

const SKILLS_LIST = [
  'JavaScript', 'Python', 'React', 'Figma', 'CSS', 'C++', 'Arduino', 'Marketing', 'Excel', 'Public Speaking',
  'Tally', 'Trading', 'Data Analysis', 'LaTeX', 'Finance', 'Leadership', 'Editing', 'TensorFlow', 'Node.js',
  'MongoDB', 'Docker', 'Photoshop', 'TailwindCSS', 'Social Media', 'Java', 'SQL'
];

const BIOS_MALE = [
  'Coffee addict ☕ | DSA nerd | Looking for someone to debug life with.',
  'Into robotics and weird sci-fi novels 🤖',
  'Gym rat by day, meme lord by night 🏋️‍♂️',
  'Finance bro who somehow ended up here. Send help.',
  'Training AI models all day, trying to find human connection IRL.',
  'Backend dev and occasional philosopher. Ask me about databases at 2 AM 💻',
  'Guitar player & late night road tripper 🎸',
  'Chai > Coffee. Always up for football discussions ⚽',
  'Code, sleep, repeat. Looking for my player two 🎮',
  'Architect of my own dreams. Let us grab boba tea!'
];

const BIOS_FEMALE = [
  'Art lover 🎨 | Foodie | Certified overthinker.',
  'Entrepreneur in the making 🚀 | Chai > Coffee.',
  'Star-gazer 🌌 | Quantum enthusiast | Introvert trying to be social.',
  'Bookworm 📚 | Tea obsessed | Will talk about Austen for hours.',
  'Frontend dev who actually cares about UX. Rare species ✨',
  'Spotify wrapped says I listened to Taylor Swift for 8000 hours 🎵',
  'Photographer & amateur baker. I bring cookies on first dates 🍪',
  'Dancer, traveler, believer in good vibes only 💃',
  'Designing pixels by day, bingeing anime by night 🍿',
  'Looking for a concert buddy & fellow foodie 🍜'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems(arr, maxCount) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(1 + Math.random() * (maxCount - 1)));
}

async function seed100() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set in environment.');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected.\n');

  console.log('🗑  Wiping old collection data...');
  await Promise.all([
    User.deleteMany({}),
    Admin.deleteMany({}),
    Like.deleteMany({}),
    Dislike.deleteMany({}),
    Match.deleteMany({}),
    Block.deleteMany({}),
    Report.deleteMany({}),
    AccountFlag.deleteMany({}),
    AnonymousPost.deleteMany({}),
    Feedback.deleteMany({}),
    Announcement.deleteMany({}),
    AdminAction.deleteMany({}),
    EmailVerification.deleteMany({}),
    IdentityVerificationRequest.deleteMany({}),
    Payment.deleteMany({})
  ]);
  console.log('✅ Database cleaned.\n');

  // 1. Create Admin Account
  console.log('👤 Creating Admin Account...');
  const adminEmail = (process.env.ADMIN_EMAILS || '').split(',')[0].trim() || 'admin@stu.adamasuniversity.ac.in';
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = new Admin({ email: adminEmail.toLowerCase(), passwordHash: adminPasswordHash, active: true });
  await admin.save();
  console.log(`✅ Admin created: ${adminEmail}\n`);

  // 2. Generate 100 User Profiles (50 Male, 50 Female)
  console.log('👥 Generating 100 Realistic Profiles...');
  const userPasswordHash = await bcrypt.hash(USER_PASSWORD, 10);
  const users = [];

  for (let i = 0; i < 100; i++) {
    const isMale = i < 50;
    const gender = isMale ? 'male' : 'female';
    const firstName = isMale ? MALE_NAMES[i % MALE_NAMES.length] : FEMALE_NAMES[i % FEMALE_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + (isMale ? 1 : 2)) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const cleanUsername = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i + 1}`;

    // 85% Adamas University college emails, 15% outsiders
    const isCollegeStudent = i % 7 !== 0;
    const email = isCollegeStudent
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 10}@stu.adamasuniversity.ac.in`
      : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 10}@gmail.com`;

    const age = 18 + (i % 7); // 18 - 24
    const height = isMale ? 170 + (i % 20) : 155 + (i % 18);
    const course = getRandomItem(COURSES);
    const school = isCollegeStudent ? 'Adamas University' : getRandomItem(['Delhi University', 'Calcutta University', 'Jadavpur University', 'IEM Kolkata']);
    const bio = isMale ? getRandomItem(BIOS_MALE) : getRandomItem(BIOS_FEMALE);
    const hobbies = getRandomItems(HOBBIES_LIST, 4);
    const skills = getRandomItems(SKILLS_LIST, 4);
    const lookingFor = (i % 4 === 0) ? 'friends' : 'dating';

    // Tier distribution: 70% Free, 20% Silver, 10% Gold
    let tier = 'free';
    let isPremium = false;
    let autopayStatus = 'none';
    let subscriptionExpiresAt = null;

    if (i % 10 === 0) {
      tier = 'gold';
      isPremium = true;
      autopayStatus = 'active';
      subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (i % 5 === 0) {
      tier = 'silver';
      isPremium = true;
      autopayStatus = 'active';
      subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Avatar URLs from portraits
    const portraitIndex = (i % 50) + 1;
    const avatarUrl = `https://randomuser.me/api/portraits/${isMale ? 'men' : 'women'}/${portraitIndex}.jpg`;

    const identityStatus = isCollegeStudent ? (i % 6 === 0 ? 'pending' : 'verified') : 'not_submitted';
    const badges = [];
    if (identityStatus === 'verified') badges.push('Verified Student');
    if (tier === 'gold') badges.push('Gold Member');
    if (tier === 'silver') badges.push('Silver Member');

    const user = new User({
      email,
      username: cleanUsername,
      passwordHash: userPasswordHash,
      name,
      age,
      gender,
      height,
      school,
      course,
      bio,
      hobbies,
      skills,
      lookingFor,
      sexualOrientation: 'straight',
      emailVerified: isCollegeStudent,
      identityStatus,
      isPremium,
      tier,
      autopayStatus,
      subscriptionExpiresAt,
      badges,
      pictures: [
        { url: avatarUrl, fileId: `avatar_${gender}_${i + 1}` },
        { url: `https://picsum.photos/seed/${cleanUsername}/600/800`, fileId: `pic2_${i + 1}` }
      ],
      tags: {
        smoke: i % 5 === 0,
        drink: i % 3 === 0,
        pets: i % 2 === 0
      }
    });

    await user.save();
    users.push(user);
    if ((i + 1) % 20 === 0) console.log(`  ✓ Saved ${i + 1}/100 profiles...`);
  }

  // 3. Create Mutual Matches, Likes, Dislikes
  console.log('\n💘 Creating Likes, Swipes & Mutual Matches...');
  let matchCount = 0;
  let likeCount = 0;

  // Create mutual matches between pairs
  for (let i = 0; i < 20; i++) {
    const maleUser = users[i];
    const femaleUser = users[50 + i];

    // Both like each other -> Match
    await Like.create({ fromUserId: maleUser._id, toUserId: femaleUser._id, type: 'like' });
    await Like.create({ fromUserId: femaleUser._id, toUserId: maleUser._id, type: 'like' });

    const conversationId = `conv_${[maleUser._id.toString(), femaleUser._id.toString()].sort().join('_')}`;
    await Match.create({ userA: maleUser._id, userB: femaleUser._id, conversationId });
    matchCount++;
    likeCount += 2;
  }

  // Create random incoming/outgoing likes
  for (let i = 20; i < 45; i++) {
    const maleUser = users[i];
    const femaleUser = users[50 + i];

    // Female likes Male
    await Like.create({ fromUserId: femaleUser._id, toUserId: maleUser._id, type: i % 4 === 0 ? 'superlike' : 'like' });
    likeCount++;
  }

  // Create random left swipes / dislikes
  for (let i = 40; i < 50; i++) {
    const maleUser = users[i];
    const femaleUser = users[50 + i];
    await Dislike.create({ fromUserId: maleUser._id, toUserId: femaleUser._id });
  }

  console.log(`  ✓ Created ${likeCount} Likes and ${matchCount} Mutual Matches.`);

  // 4. Create Payments Log Entries for Subscribed Users
  console.log('\n💳 Generating Payment & Subscriptions Log...');
  let paymentCount = 0;
  for (const u of users) {
    if (u.tier !== 'free') {
      const payment = new Payment({
        userId: u._id,
        tier: u.tier,
        amount: u.tier === 'gold' ? 49 : 39,
        amountPaise: u.tier === 'gold' ? 4900 : 3900,
        currency: 'INR',
        razorpaySubscriptionId: `sub_seed_${u.tier}_${u._id.toString().slice(-6)}`,
        razorpayPaymentId: `pay_seed_${u._id.toString().slice(-6)}`,
        isAutopay: true,
        status: 'active',
        activatedAt: new Date(),
        expiresAt: u.subscriptionExpiresAt
      });
      await payment.save();
      paymentCount++;
    }
  }
  console.log(`  ✓ Logged ${paymentCount} active subscription payment transactions.`);

  // 5. Create System Announcements & Feedbacks
  console.log('\n📢 Creating Announcements & Feedbacks...');
  await Announcement.create({
    title: '🎉 Welcome to Frnd Beta!',
    content: 'We are thrilled to launch the official Adamas University dating & friendship platform! Discover matches, chat securely, and upgrade to Silver or Gold for unlimited perks.',
    adminId: admin._id
  });

  for (let i = 0; i < 5; i++) {
    await Feedback.create({
      userId: users[i]._id,
      content: `App experience is super smooth! Love the ${users[i].tier} tier features.`
    });
  }
  console.log('  ✓ Announcements & Feedback seeded successfully.');

  console.log('\n' + '═'.repeat(60));
  console.log('🌱 SEEDING 100 PROFILES COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  Admin Email  : ${adminEmail}`);
  console.log(`  Admin Pass   : ${ADMIN_PASSWORD}`);
  console.log(`  Common Pass  : ${COMMON_PASS}`);
  console.log(`  User Pass    : ${USER_PASSWORD} (for all 100 test accounts)`);
  console.log('═'.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

seed100().catch(err => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
