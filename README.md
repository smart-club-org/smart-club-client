# Smart Club

## Project Description

Smart Club is an online booking and management system for computer clubs. The platform allows users to browse available clubs, check seat availability, and make reservations online.

## Problem Statement

Many computer clubs still manage bookings manually via phone calls or messaging apps. This often leads to double bookings, unclear seat availability, and inconvenience for customers. Our system solves this by providing a centralized online booking platform.

## Proposed Solution

We developed a full-stack web application where users can:

* Register and log in
* Browse computer clubs
* View available seats
* Make reservations
* Cancel bookings
* View booking history

## Target Users

* Customers of computer clubs
* Computer club owners

## Technology Stack

Frontend: React, Vite, Tailwind CSS
Backend: Java Spring Boot, Spring Security
Database: MongoDB Atlas
Hosting: Vercel (frontend), Render (backend)

## Key Features

* User authentication (login/register)
* Browse clubs
* Seat availability system
* Booking system
* Reservation history
* Deployed full-stack system

## Deployed Application

Frontend: https://smart-club-client.vercel.app
Backend: https://smart-club-server.onrender.com

## GitHub Repositories

Frontend: https://github.com/smart-club-org/smart-club-client
Backend: https://github.com/smart-club-org/smart-club-server

---

## How to Run Locally

### Backend

1. Go to backend folder
2. Create file:

```text
src/main/resources/application-local.properties
```

3. Add:

```properties
spring.data.mongodb.uri=YOUR_MONGODB_URI
server.port=8080
```

4. Run:

```bash
./mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
```

Or on Windows:

```powershell
.\mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
```

---

### Frontend

1. Go to frontend folder
2. Create file:

```text
.env
```

3. Add:

```env
VITE_API_BASE_URL=http://localhost:8080
```

4. Run:

```bash
npm install
npm run dev
```

5. Open:

```text
http://localhost:5173
```

---


## Team Members

Myngzhas Miras — Student ID: 230103214  
Tynybekuly Assylkeney — Student ID: 230103138  
Serketay Nurdaulet — Student ID: 230103358  
Sarsembay Aibat — Student ID: 230103159

