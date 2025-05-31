# 🧠 KOL Backend V1

This is the official backend service for the **KOL (Key Opinion Leader) platform**, built with **Node.js**, **Express**, **TypeORM**, and **TypeScript**. It supports all major backend operations for:

* 🎯 **KOL Users**
* 🛠️ **KOL Admin Panel**
* 🚀 **Amplify Bounty Program**

The API serves as a foundational layer for the entire KOL ecosystem, providing features like user onboarding, influencer management, admin operations, checkout flows, invoicing, and a custom bounty platform.

---

## 🚀 Features

* ✅ TypeScript + Express server
* ✅ Modular route handling
* ✅ Swagger documentation (`/docs`)
* ✅ PostgreSQL integration via TypeORM
* ✅ RESTful APIs for User, Admin, and Bounty operations
* ✅ CORS-enabled API
* ✅ Environment-based config loading
* ✅ Cleanly separated route layers
* ✅ Bounty + Submission endpoints
* ✅ Admin dashboard and proposal APIs

---

## 🧩 Folder Structure

```
.
├── src/
│   ├── config/              # DB, Logger, Env config
│   ├── middleware/          # Custom middlewares (e.g., CORS)
│   ├── routes/              # Route handlers (user, admin, bounty, etc.)
│   │   └── v1/              # Versioned route sets
│   ├── models/              # DB entities and models
│   └── swagger.json         # Swagger base definition
├── .env                     # Your environment variables
├── tsconfig.json            # TypeScript config
└── README.md
```

---

## 📦 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/kol-backend-v1.git
cd kol-backend-v1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then fill in your environment variables:

```env
PORT=3000
VERSION=1
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_pg_user
DB_PASSWORD=your_pg_password
DB_NAME=kol_db
JWT_SECRET=your_jwt_secret
```

### 4. Run Locally

```bash
npm run start
```

You should see logs indicating:

* Database successfully connected
* Server running on your configured port

---

## 📘 API Documentation

Interactive API docs are available at:

```
http://localhost:3000/docs
```

These are auto-generated using `swagger-jsdoc` and `swagger-ui-express`, based on route and model definitions.

---

## 🛣️ API Endpoints Overview

> All routes are versioned under `/api/v1/`

### 🔐 Auth & User

* `POST /auth/login`
* `GET /questions`
* `GET /onboarding-questions`
* `POST /user-onboarding-selections`

### 📦 Package & Cart

* `GET /packages`
* `GET /package-items`
* `POST /cart`
* `POST /influencer-cart-item`
* `POST /package-cart-item`

### 💳 Checkout & Invoice

* `POST /checkout`
* `GET /invoice`

### 🎯 Admin Panel

* `POST /admin/auth/login`
* `GET /admin/influencer`
* `GET /admin/client`
* `GET /admin/proposal`
* `GET /admin/dashboard-details`

### 🏆 Bounty System

* `POST /bounty`
* `POST /bounty-submission`

---

## 🧪 Testing API

You can test all routes using:

* Swagger UI at `/docs`
* Postman collections (coming soon)
* `curl` or HTTP clients like Thunder Client/Insomnia

---

## 🧰 Tech Stack

| Technology       | Description                    |
| ---------------- | ------------------------------ |
| Node.js          | Backend runtime                |
| Express          | Web framework                  |
| TypeORM          | ORM for PostgreSQL             |
| Swagger UI       | API documentation              |
| TypeScript       | Static typing                  |
| PostgreSQL       | Primary database               |
| CORS             | Cross-origin resource sharing  |
| Reflect Metadata | Required by TypeORM decorators |

---

## ✅ To-Do / Future Enhancements

* [ ] Add Role-Based Access Control (RBAC)
* [ ] Add Postman Collection
* [ ] Write Unit and Integration Tests
* [ ] Add CI/CD pipeline
* [ ] Dockerize the service
* [ ] Add Redis or caching layer for improved performance

---

## 👨‍💻 Contributing

PRs and issues are welcome! Please follow conventional commits and structure your changes modularly.

---

## 🛡️ License

This project is licensed under the **MIT License**.

---

## 📞 Contact

For queries, drop a message to the backend team or raise an issue on the repository.
