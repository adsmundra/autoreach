
import { db, pool } from '../lib/db';
import { 
  brandprofile, 
  brandAnalyses, 
  conversations, 
  messages, 
  messageFeedback, 
  aeoReports,
  notifications
} from '../lib/db/schema';
import { fileGenerationJobs } from '../lib/db/schema.files';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const sourceEmail = args[0];
  const targetEmail = args[1];

  if (!sourceEmail || !targetEmail) {
    console.error('Usage: tsx scripts/transfer-email-data.ts <source-email> <target-email>');
    process.exit(1);
  }

  console.log(`Transferring data from ${sourceEmail} to ${targetEmail}...`);

  try {
    // 1. Get User IDs
    // We access the "user" table directly via SQL because it's managed by Better Auth and not in our Drizzle schema
    const userRes = await pool.query('SELECT id, email FROM "user" WHERE email = $1 OR email = $2', [sourceEmail, targetEmail]);
    
    const sourceUser = userRes.rows.find(u => u.email === sourceEmail);
    const targetUser = userRes.rows.find(u => u.email === targetEmail);

    if (!sourceUser) {
      console.error(`Source user not found: ${sourceEmail}`);
      process.exit(1);
    }
    if (!targetUser) {
      console.error(`Target user not found: ${targetEmail}`);
      process.exit(1);
    }

    const sourceUserId = sourceUser.id;
    const targetUserId = targetUser.id;

    console.log(`Source User ID: ${sourceUserId}`);
    console.log(`Target User ID: ${targetUserId}`);

    // 2. Transfer Data
    
    // Brand Profiles
    const brandsRes = await db.update(brandprofile)
      .set({ userId: targetUserId })
      .where(eq(brandprofile.userId, sourceUserId))
      .returning({ id: brandprofile.id });
    console.log(`Transferred ${brandsRes.length} brand profiles.`);

    // Brand Analyses
    const analysesRes = await db.update(brandAnalyses)
      .set({ userId: targetUserId })
      .where(eq(brandAnalyses.userId, sourceUserId))
      .returning({ id: brandAnalyses.id });
    console.log(`Transferred ${analysesRes.length} brand analyses.`);

    // Conversations
    const convRes = await db.update(conversations)
      .set({ userId: targetUserId })
      .where(eq(conversations.userId, sourceUserId))
      .returning({ id: conversations.id });
    console.log(`Transferred ${convRes.length} conversations.`);

    // Messages
    const msgRes = await db.update(messages)
      .set({ userId: targetUserId })
      .where(eq(messages.userId, sourceUserId))
      .returning({ id: messages.id });
    console.log(`Transferred ${msgRes.length} messages.`);
    
    // Message Feedback
    const fbRes = await db.update(messageFeedback)
      .set({ userId: targetUserId })
      .where(eq(messageFeedback.userId, sourceUserId))
      .returning({ id: messageFeedback.id });
    console.log(`Transferred ${fbRes.length} message feedbacks.`);

    // AEO Reports
    const aeoRes = await db.update(aeoReports)
      .set({ userId: targetUserId, userEmail: targetEmail })
      .where(eq(aeoReports.userId, sourceUserId))
      .returning({ id: aeoReports.id });
    console.log(`Transferred ${aeoRes.length} AEO reports.`);

    // File Generation Jobs
    const fileRes = await db.update(fileGenerationJobs)
      .set({ userId: targetUserId, userEmail: targetEmail })
      .where(eq(fileGenerationJobs.userId, sourceUserId))
      .returning({ id: fileGenerationJobs.id });
    console.log(`Transferred ${fileRes.length} file generation jobs.`);

    // Notifications
    const notifRes = await db.update(notifications)
      .set({ userId: targetUserId, userEmail: targetEmail })
      .where(eq(notifications.userId, sourceUserId))
      .returning({ id: notifications.id });
    console.log(`Transferred ${notifRes.length} notifications.`);

    console.log('-----------------------------------');
    console.log('Transfer complete successfully.');

  } catch (error) {
    console.error('Error executing transfer:', error);
  } finally {
    // Close the pool to allow the script to exit
    await pool.end();
  }
}

main();
