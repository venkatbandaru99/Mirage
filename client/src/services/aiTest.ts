// Simple test to check if Transformers.js works
export async function testTransformers() {
  try {
    console.log('🧪 Testing Transformers.js...');
    
    // Try basic import
    const transformers = await import('@xenova/transformers');
    console.log('📦 Import successful, available exports:', Object.keys(transformers));
    
    // Check if pipeline exists
    if (!transformers.pipeline) {
      throw new Error('Pipeline not available');
    }
    
    console.log('✅ Basic import test passed');
    return true;
  } catch (error) {
    console.error('❌ Transformers.js test failed:', error);
    return false;
  }
}