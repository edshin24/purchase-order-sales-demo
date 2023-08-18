export default async function handler(req, res) {
    const url = req.query.url;
    
    try {
       const response = await fetch(url);
 
       if (!response.ok) {
          throw new Error('Network response was not ok');
       }
 
       const data = await response.json();
       res.status(200).json(data);
    } catch (error) {
       console.error('Error fetching data:', error.message);
       res.status(500).json({ error: 'Failed to fetch data' });
    }
 }