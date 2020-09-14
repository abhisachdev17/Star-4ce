# Star-4ce

## Dependencies:

1. node and npm: this are needed to run the program, npm is used to install additional dependencies. This can be downloaded from their respective websites
2. Express.js: To create an http server, use: npm install express
3. vectors: vectors are not present in Node.js by default, To install use: npm install vectors
4. socket.io: for communication, use: npm install socket.io

## How to run

Once you have the dependencies installed run by the following command: node game_server.js

This will host the game server on the localhost on port 5000. Visit the address on any browser and start playing!

## Introduction
Star 4ce is a distributed online multiplayer game where players can compete with other players to obtain galactic supremacy. Each player has a starship that they can control using dragging the mouse in the direction they want to go. The player can also fire bullets using the space bar. If the bullet hits an opponent player, their health is decreased by one point. Each player is only allowed to take four bullet hits, after which the game is over for them. The health bar is displayed on the top left. Further, there are asteroids, which on impact can slow the player down. Bigger the asteroid, more time the player will spend in the slow-down state, which can give other players a chance to attack them. It makes the game more competitive.

## What Technologies did I use?
The communication protocol between client and server is written using Socket.io. Socket.io is a JavaScript library that enables real-time communication between web clients and servers. Socket.io uses the WebSocket protocol internally, which allows it to provide bi-directional communication between both sides with a single TCP connection. Socket.io is also event-driven, which allowed me to register callbacks that occur on a given event seamlessly. The Library also provided functionality to broadcast messages to all connected clients, which made it easier to pass game states from servers to clients.
The game is developed entirely using JavaScript, where the frontend of the game is built using p5.js, and the backend is built using NodeJs. The reason why I chose this tech stack is because of my experience using both. While I started building the backend using python, which also provided support for Socket.io and tried to make the game multithreaded, I had to move to NodeJs because of the compatibility issues of multithreaded Python applications with Socket.io and the reduction in speed achieved thereof.
## Distributed Computing problems addressed
The major distributed problem that I try to address by making this game is the delegation of work between clients and servers while making the game behave stable to faulty inputs by the clients. This problem is one of the major problems as state management becomes more complicated when we start to delegate work. This results in state synchronization problems or worse when the poor state management results in giving too much power to clients, resulting in the introduction of modding. Note that the game is still not full proof because the speed of a
spaceship is still being managed on the client-side, and there might be better alternatives to the management that I address.

1. Who manages movements? This is a delegation issue, where if the server manages movements based on the client's input, will cause too much load on the server and slower response times and choppy movements. Thus, the player movements are managed on the client-side for this game. The player positions are updated and stored on the server for every successful movement of the client.

2. Who manages the Health? If we let clients in control of their health, this would let malicious clients to never die. Thus, health is managed on the server, where it defines maximum health for clients and passes it to clients. The health of an opponent changes when they are hit, and the server updates their health accordingly.

3. Who manages the bullets? This was a major issue, as allowing clients to manage the bullets will allow for malicious clients to change trajectory resulting into an unstable game, but letting server manage the bullet's trajectory means that the bullet animation is choppy and the server is constantly emitting bullet updates to all clients resulting into more load on the server. I chose to let the server manages the bullet trajectory, where the client registers a bullet event, and the server takes care of the rest.

4. Who determines bullet hits? This problem came down to the capability of the server, i.e. if the server can go through all the clients in the entire game space and determine if any bullet hit them. As the server in this game is slow and NodeJs runs on a single thread, making the server manage all the hits would result in a slow game. To solve this issue, I pass bullets back to clients, where a client can determine if their bullet hits other players.

5. How are hits managed after a client determines if their bullet hit someone? As mentioned, I let clients determine if their bullet hit the opponents. But they still must request the server with a bullet hit event where the server has the final say. This is to prevent malicious clients and handle latency Issues.

### Managing Latency Issues
While delegating the work between clients and the server, problems arise if a client with higher latency, passes the bullet events on the server and when the server tries to confirm the event correctness, the opponent has already moved very far from its original position. I try to address this issue by using a simple prediction method and timestamps. In this game, the client passes the event with bullet and player coordinates and a timestamp of the event. The server checks the timestamp and compares it with opponents updated timestamp. The server then checks if the difference is minimal, checks the event correctness, and determines a hit. If the difference between timestamps is higher, the server checks how far the opponent might have moved based on its current speed in this time difference. This distance is subtracted from the current distance between a bullet hit position and the opponent. This method is simple and allows for unexpected results but works fine for a small difference in latency.
