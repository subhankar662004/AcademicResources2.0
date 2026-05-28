/**
 * initDb.js — Run once to create all collections and indexes in a fresh MongoDB database.
 * Usage: node initDb.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Folder from './models/Folder.js';
import Resource from './models/Resource.js';
import OTP from './models/OTP.js';
import Message from './models/Message.js';
import Test from './models/Test.js';
import Question from './models/Question.js';
import Result from './models/Result.js';
import GeneratedTest from './models/GeneratedTest.js';
import PushSubscription from './models/PushSubscription.js';
import PasswordResetToken from './models/PasswordResetToken.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set in .env');
  process.exit(1);
}

const models = [
  { name: 'users',               model: User },
  { name: 'folders',             model: Folder },
  { name: 'resources',           model: Resource },
  { name: 'otps',                model: OTP },
  { name: 'messages',            model: Message },
  { name: 'tests',               model: Test },
  { name: 'questions',           model: Question },
  { name: 'results',             model: Result },
  { name: 'generatedtests',      model: GeneratedTest },
  { name: 'pushsubscriptions',   model: PushSubscription },
  { name: 'passwordresettokens', model: PasswordResetToken },
];

async function initDb() {
  console.log('🔗  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected\n');

  for (const { name, model } of models) {
    try {
      await model.syncIndexes();
      console.log(`✅  ${name}`);
    } catch (err) {
      console.error(`❌  ${name}: ${err.message}`);
    }
  }

  console.log('\n🎉  All collections and indexes are ready!');
  await mongoose.disconnect();
}

initDb().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
