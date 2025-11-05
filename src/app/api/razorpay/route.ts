import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Create an order
export async function POST(request: Request) {
    const { amount, eventId } = await request.json();

    // Fetch event details to confirm price server-side
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const eventData = eventSnap.data();

    if (eventData.price !== amount) {
         return NextResponse.json({ error: 'Price mismatch' }, { status: 400 });
    }
    
    const options = {
        amount: amount, // amount in the smallest currency unit
        currency: 'INR',
        receipt: `receipt_event_${eventId}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        return NextResponse.json({ order });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}


// Verify payment signature
export async function PUT(request: Request) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        // Here you would typically also save the payment details to your database
        // e.g., await db.collection('payments').add({...});
        
        return NextResponse.json({ success: true, paymentId: razorpay_payment_id });
    } else {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
}
