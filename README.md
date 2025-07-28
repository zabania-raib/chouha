# Discord OAuth2 Node.js Example

This is a full-stack Node.js project that demonstrates how to implement Discord OAuth2 authentication using an Express web server.

## Features

- **Discord OAuth2 Login**: Redirects users to Discord for authentication.
- **Fetch User Data**: Retrieves user's Discord ID, username, email, and avatar URL.
- **Data Persistence**: Saves user data to a `users.json` file.
- **Ready for Deployment**: Includes configuration for Railway and Netlify.

## Project Structure

```
/
├── index.js                # Main Express server file
├── package.json            # Project dependencies and scripts
├── users.json              # Stores authenticated user data (created automatically)
├── .env                    # Environment variables (you need to create this)
├── README.md               # This file
├── netlify.toml            # Netlify deployment configuration
└── views/
    └── success.html        # Page shown after successful login
```

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- A [Discord account](https://discord.com/)

### 2. Create a Discord Application

1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **"New Application"** and give it a name.
3.  Go to the **"OAuth2"** tab.
4.  Copy the **Client ID** and **Client Secret**.
5.  In the **"Redirects"** section, add the following URL: `http://localhost:3000/api/auth/discord/redirect`
    - You will need to add your production URL here as well when you deploy.

### 3. Local Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root of the project and add your Discord application credentials:
    ```env
    DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
    DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
    DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/redirect
    ```

4.  **Start the server:**
    ```bash
    npm start
    ```

    The application will be running at `http://localhost:3000`.

## Deployment

### Deploying to Railway

1.  **Create a new project on Railway** and link it to your GitHub repository.
2.  Railway will automatically detect the `package.json` and use the `npm start` command.
3.  **Add Environment Variables:**
    - In your Railway project dashboard, go to the **"Variables"** tab.
    - Add the `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`.
    - **Important**: Update `DISCORD_REDIRECT_URI` to your Railway production URL (e.g., `https://your-app-name.up.railway.app/api/auth/discord/redirect`).
4.  **Update Discord Application:**
    - Go back to your Discord Developer Portal and add the new Railway URL to the list of OAuth2 redirects.

### Deploying to Netlify (Detailed Guide)

Deploying this Express application to Netlify requires using Netlify Functions to run the server-side code. The project has been structured to support this.

**Important**: Before you start, make sure you have pushed your project to a GitHub, GitLab, or Bitbucket repository.

#### Step 1: Connect Your Repository to Netlify

1.  Log in to your [Netlify account](https://app.netlify.com).
2.  Click **"Add new site"** and select **"Import an existing project"**.
3.  Connect to your Git provider (e.g., GitHub).
4.  Select the repository for this project.

#### Step 2: Configure Build Settings

Netlify will automatically detect the `netlify.toml` file in your repository. The settings should be pre-filled, but you can verify them:

-   **Build command**: `npm install`
-   **Publish directory**: (Leave blank)
-   **Functions directory**: `functions`

Click **"Deploy site"**. Netlify will start building and deploying your site.

#### Step 3: Add Environment Variables

Your site will not work without the Discord API credentials. You must add them to your Netlify site's environment variables.

1.  Once your site is deployed, go to the site's dashboard on Netlify.
2.  Navigate to **Site settings > Build & deploy > Environment**.
3.  Click **"Edit variables"** and add the following key-value pairs:
    -   `DISCORD_CLIENT_ID`: Your Discord application's Client ID.
    -   `DISCORD_CLIENT_SECRET`: Your Discord application's Client Secret.
    -   `DISCORD_REDIRECT_URI`: Your Netlify site's redirect URI.

#### Step 4: Update the Redirect URI

This is a critical step. You need to tell both your Netlify app and your Discord app what the production URL is.

1.  **Find your Netlify URL**: It will be something like `https://your-site-name.netlify.app`.
2.  **Update the `DISCORD_REDIRECT_URI` Environment Variable on Netlify**: Change its value to `https://your-site-name.netlify.app/api/auth/discord/redirect`.
3.  **Update the Redirect URI in your Discord Application**:
    -   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    -   Select your application.
    -   Go to the **"OAuth2"** tab.
    -   In the **"Redirects"** section, click **"Add Redirect"** and paste your Netlify redirect URI: `https://your-site-name.netlify.app/api/auth/discord/redirect`.
    -   Click **"Save Changes"**.

#### Step 5: Trigger a Redeploy

After updating the environment variables, you should trigger a new deploy on Netlify to ensure the changes are applied.

1.  In your Netlify site dashboard, go to the **"Deploys"** tab.
2.  Click the **"Trigger deploy"** dropdown and select **"Deploy site"**.

Once the deployment is complete, your site will be live and the Discord authentication should work correctly. You can visit `https://your-site-name.netlify.app/login` to test it.
