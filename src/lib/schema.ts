import { pgTable, uuid, text, boolean, decimal, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const callStatusEnum = pgEnum('call_status', [
    'PENDING',
    'VERIFIED',
    'COMPLETED',
    'FAILED',
    'VOICEMAIL'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
    'HELD',
    'FORWARDED',
    'REFUNDED',
    'STUCK'
]);

// Users table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    address: text('address').unique().notNull(), // wallet address (lowercase)
    name: text('name'),
    realPhoneNumber: text('real_phone_number').unique(),
    phoneId: text('phone_id').unique(), // hash of phone number
    price: decimal('price', { precision: 10, scale: 2 }),
    onlyHumans: boolean('only_humans').default(false),
    rules: text('rules'), // JSON stored as text
    availability: text('availability'), // JSON stored as text
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
});

// Payments table
export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash'),
    status: paymentStatusEnum('status').default('HELD'),
    forwardTxHash: text('forward_tx_hash'),
    refundTxHash: text('refund_tx_hash'),
    createdAt: timestamp('created_at').defaultNow(),
    settledAt: timestamp('settled_at'),
});

// Call Sessions table
export const callSessions = pgTable('call_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    callerId: uuid('caller_id').references(() => users.id),
    calleeId: uuid('callee_id').references(() => users.id),
    paymentId: uuid('payment_id').references(() => payments.id),
    status: callStatusEnum('status').default('PENDING'),
    twilioCallSid: text('twilio_call_sid').unique(),
    duration: integer('duration'), // seconds
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    callsMade: many(callSessions, { relationName: 'caller' }),
    callsReceived: many(callSessions, { relationName: 'callee' }),
}));

export const callSessionsRelations = relations(callSessions, ({ one }) => ({
    caller: one(users, {
        fields: [callSessions.callerId],
        references: [users.id],
        relationName: 'caller',
    }),
    callee: one(users, {
        fields: [callSessions.calleeId],
        references: [users.id],
        relationName: 'callee',
    }),
    payment: one(payments, {
        fields: [callSessions.paymentId],
        references: [payments.id],
    }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
    callSession: one(callSessions),
}));
