async function run() {
  const personas = ['anshuman', 'abhimanyu', 'kshitij'];
  for (const p of personas) {
    console.log(`Testing API for ${p}...`);
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          selectedPersona: p
        })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`Failed for ${p}:`, data);
      } else {
        console.log(`Success for ${p}:`, data.text.substring(0, 50) + '...');
      }
    } catch (e) {
      console.error(`Fetch error for ${p}:`, e);
    }
  }
}
run();
