import mongoose from 'mongoose';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve4);

export async function connectDB(retries = 3) {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Extract hostname for DNS test
    const hostnameMatch = mongoUri.match(/@([^:/?]+)/);
    if (hostnameMatch) {
      const hostname = hostnameMatch[1];
      console.log(`🔍 Testing DNS resolution for: ${hostname}`);
      try {
        const addresses = await dnsResolve(hostname);
        console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
      } catch (dnsError) {
        console.warn(`⚠️  DNS resolution failed: ${dnsError.message}`);
      }
    }

    console.log('📡 Attempting MongoDB connection...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      family: 4, // Use IPv4
    });

    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error(
      'Connection URI:',
      process.env.MONGODB_URI ? 'Set' : 'Not set',
    );

    if (retries > 0) {
      console.log(`⏳ Retrying in 5 seconds... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    }

    console.error(
      '\n💡 Troubleshooting tips:',
      '\n   1. Check your internet connection',
      '\n   2. Verify the MongoDB hostname is correct',
      '\n   3. Check if MongoDB is accessible from your network',
      '\n   4. Try pinging the MongoDB host',
      '\n   5. Ensure firewall allows outbound connections to port 27017',
    );
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
  }
}
