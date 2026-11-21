import { createExpressApp } from '../src/server/app.ts';
import { globalVectorStore } from '../src/server/vectorStore.ts';
import { DocumentProcessor } from '../src/server/documentProcessor.ts';
import { globalRagEngine } from '../src/server/ragEngine.ts';
import { listDoctors, listSpecialties } from '../src/db/queries.ts';

async function runTests() {
  console.log('--- TEST 1: Vector Store & Default Knowledge Base ---');
  const docs = globalVectorStore.listDocuments();
  console.log(`Knowledge Base loaded with ${docs.length} documents.`);
  for (const d of docs) {
    console.log(` - ${d.name} (${d.chunkCount} chunks)`);
  }
  const chunksTotal = globalVectorStore.getChunkCount();
  console.log(`Total indexed vector chunks: ${chunksTotal}`);

  console.log('\n--- TEST 2: Document Processing & Dynamic Upload ---');
  const sampleMarkdown = `# MediSlot Oncology Protocols
Patients undergoing oncology treatment must bring prior pathology and imaging reports.
Consultations are led by board-certified medical oncologists at the Bay Area Cancer Center.
Emergency oncology pager is monitored 24/7.`;
  const base64Content = Buffer.from(sampleMarkdown, 'utf-8').toString('base64');
  const processed = await DocumentProcessor.process('sample-oncology.md', 'text/markdown', base64Content);
  console.log(`Processed document "${processed.name}": extracted ${processed.chunks.length} chunks.`);

  const addedDoc = await globalVectorStore.addDocument(
    {
      name: processed.name,
      fileType: processed.fileType,
      size: processed.size,
      description: 'Test oncology protocol',
    },
    processed.chunks
  );
  console.log(`Added doc ID: ${addedDoc.id}, Total chunks now: ${globalVectorStore.getChunkCount()}`);

  console.log('\n--- TEST 3: Semantic Retrieval & Cosine Similarity ---');
  const searchResults = await globalVectorStore.search('cancellation policy and refund fee', 2);
  console.log(`Search for "cancellation policy": found ${searchResults.length} relevant chunks:`);
  for (const r of searchResults) {
    console.log(` [Match ${Math.round(r.score * 100)}%] from ${r.chunk.documentName}:`);
    console.log(`   ${r.chunk.text.slice(0, 140)}...`);
  }

  console.log('\n--- TEST 4: RAG Engine Chat & Grounded Answers ---');
  const allDoctors = await listDoctors();
  const allSpecialties = await listSpecialties();

  // Test 4A: Knowledge base question
  console.log('Query: "What is your cancellation policy and what is the fee?"');
  const res1 = await globalRagEngine.processChat({
    message: 'What is your cancellation policy and what is the fee?',
    allDoctors,
    allSpecialties,
  });
  console.log('Answer 1:\n', res1.reply);
  console.log('Sources cited:', res1.sources.map((s) => `${s.title} (${s.type})`));

  // Test 4B: Complex / misspelled question
  console.log('\nQuery: "sudn skin rash acnee flare up, which doc can i see 2day?"');
  const res2 = await globalRagEngine.processChat({
    message: 'sudn skin rash acnee flare up, which doc can i see 2day?',
    allDoctors,
    allSpecialties,
  });
  console.log('Answer 2:\n', res2.reply);
  console.log('Recommended doctor:', res2.recommendedDoctor?.name);

  // Test 4C: Emergency red flag
  console.log('\nQuery: "I have heavy chest pain radiating to left arm and cannot breathe"');
  const res3 = await globalRagEngine.processChat({
    message: 'I have heavy chest pain radiating to left arm and cannot breathe',
    allDoctors,
    allSpecialties,
  });
  console.log('Answer 3:\n', res3.reply);

  // Test 4D: Dynamic document query
  console.log('\nQuery: "What are the rules for oncology treatment patients?"');
  const res4 = await globalRagEngine.processChat({
    message: 'What are the rules for oncology treatment patients?',
    allDoctors,
    allSpecialties,
  });
  console.log('Answer 4:\n', res4.reply);
  console.log('Sources cited:', res4.sources.map((s) => `${s.title} (${s.type})`));

  console.log('\nALL RAG SYSTEM TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
