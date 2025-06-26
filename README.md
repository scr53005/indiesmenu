# Hive Transfer Fulfillment System

## Overview

This project is a Next.js application designed to monitor Hive blockchain transfers, display them in a user interface, and allow users to mark them as "fulfilled." It appears to be tailored for a restaurant or similar service that accepts payments via Hive and needs to track orders. New transfers trigger notifications and are displayed until marked as fulfilled.

## Features

- **Real-time Transfer Monitoring:** Polls the Hive blockchain (via an internal API) for new transfers to a specified account.
- **Order Display:** Shows relevant information for each transfer, including sender, amount, memo (order details), and timestamp.
- **Visual and Audible Notifications:** Provides toast notifications and sound alerts for new incoming orders.
- **Order Fulfillment:** Allows users to mark transfers as "fulfilled," which updates their status in the database and removes them from the active order list.
- **Late Order Indication:** Highlights orders that have been pending for more than 10 minutes.
- **Database Integration:** Uses a PostgreSQL database (managed with Prisma) to store transfer data and fulfillment status.

## Technologies Used

- **Next.js:** React framework for server-side rendering and static site generation.
- **React:** JavaScript library for building user interfaces.
- **TypeScript:** Superset of JavaScript that adds static typing.
- **Prisma:** ORM for database access and management.
- **PostgreSQL:** Relational database used to store application data.
- **Tailwind CSS:** (Potentially, based on `postcss.config.mjs` and common Next.js setups, though not explicitly confirmed in other files).
- **Axios:** Promise-based HTTP client for making API requests.
- **React Toastify:** For displaying notifications.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables. See the "Environment Variables" section below for details.

4.  **Database Setup:**
    - Ensure you have a PostgreSQL server running.
    - Update the `DATABASE_URL` in your `.env` file with your PostgreSQL connection string.
    - Run database migrations to create the necessary tables:
      ```bash
      npx prisma migrate dev
      ```
    - (Optional) If you need to generate Prisma Client after changes to `schema.prisma`:
      ```bash
      npx prisma generate
      ```

5.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root with the following:

```env
# URL for your PostgreSQL database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# The Hive account to monitor for incoming transfers
NEXT_PUBLIC_HIVE_ACCOUNT="your-hive-account"

# (Potentially other variables if used by Neon serverless or Vercel Postgres in production)
# e.g. POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING for Vercel deployments
```
*Note: The `package.json` mentions `@neondatabase/serverless` and `@vercel/postgres`. If deploying to these platforms, additional or different environment variables might be required for the database connection.*

## API Endpoints

### 1. `GET /api/poll-hbd`
   - **Description:** Polls for new HBD (Hive Backed Dollar) transfers to the `NEXT_PUBLIC_HIVE_ACCOUNT`.
   - **Query Parameters:**
     - `lastId` (string, optional): The ID of the last transfer received. The API will return transfers newer than this ID. Defaults to '0' if not provided.
   - **Responses:**
     - `200 OK`:
       ```json
       {
         "transfers": [
           {
             "id": "string", // Transfer ID
             "from_account": "string",
             "amount": "string",
             "symbol": "string", // e.g., "HBD"
             "memo": "string", // Raw memo
             "parsedMemo": "string | object", // Potentially parsed memo
             "received_at": "string" // ISO 8601 timestamp
           }
         ],
         "latestId": "string", // The ID of the most recent transfer polled
         "error": "string" // Optional error message
       }
       ```
     - `500 Internal Server Error`: If an error occurs during polling.

### 2. `POST /api/fulfill`
   - **Description:** Marks a specific transfer as fulfilled.
   - **Request Body:**
     ```json
     {
       "id": "string" // The ID of the transfer to fulfill
     }
     ```
   - **Responses:**
     - `200 OK`:
       ```json
       {
         "message": "Transfer fulfilled"
       }
       ```
     - `400 Bad Request`: If `id` is not provided.
     - `404 Not Found`: If the transfer ID does not exist or is already fulfilled.
     - `500 Internal Server Error`: If an error occurs during the update.

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes the following main models:

-   **`transfers`**: Stores information about Hive transfers.
    -   `id`: BigInt (Primary Key) - The unique ID of the transfer.
    -   `from_account`: String - The Hive account that sent the transfer.
    -   `amount`: String - The amount of the transfer.
    -   `symbol`: String - The currency symbol (e.g., "HBD").
    -   `memo`: String? - The memo attached to the transfer.
    -   `parsed_memo`: String? - A parsed version of the memo.
    -   `fulfilled`: Boolean? (default: `false`) - Whether the transfer has been marked as fulfilled.
    -   `received_at`: DateTime? (default: `now()`) - Timestamp when the transfer was recorded.
    -   `fulfilled_at`: DateTime? - Timestamp when the transfer was marked as fulfilled.

-   **`restaurants`**: (Potentially for multi-tenant features, not fully clear from frontend)
    -   `id`: Int (Primary Key)
    -   `name`: String (Unique)
    -   `display_name`: String
    -   `description`: String?
    -   ... and relations to `user_restaurant_authorizations`.

-   **`users`**: (Potentially for user authentication and authorization, not fully clear from frontend)
    -   `id`: Int (Primary Key)
    -   `hive_username`: String (Unique)
    -   `display_name`: String?
    -   `email`: String?
    -   ... and relations to `user_restaurant_authorizations`.

-   **`user_restaurant_authorizations`**: Links users to restaurants with specific roles.
    -   `id`: Int (Primary Key)
    -   `user_id`: Int (Foreign Key to `users`)
    -   `restaurant_id`: Int (Foreign Key to `restaurants`)
    -   `role`: String (e.g., "admin")

*This README provides a general overview. For more detailed information, please refer to the source code.*
