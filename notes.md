• After establishing the WebSocket connection, the client should send an authentication message:

    ws.send(JSON.stringify({ type: 'authenticate', token: '<JWT_TOKEN>' }));


• Upon receiving the 'authenticated' message, the client can start handling 'deviceData' messages for  
 real-time updates.
