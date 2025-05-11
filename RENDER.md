# Deploying WhiBO on Render.com

Follow these step-by-step instructions to deploy WhiBO on Render.com's free tier.

## Before You Begin

1. Create a [GitHub](https://github.com) account if you don't already have one
2. Push your WhiBO code to a GitHub repository
3. Create a [Render.com](https://render.com) account (you can sign up with your GitHub account)

## Deployment Steps

### 1. Sign in to Render.com

Open [Render Dashboard](https://dashboard.render.com) and sign in.

### 2. Create a New Web Service

- Click **New +** in the top right corner
- Select **Web Service**

### 3. Connect Your Repository

- Select **Connect a repository**
- Connect your GitHub account if not already connected
- Find and select your WhiBO repository

### 4. Configure Your Web Service

Complete the form with the following information:

- **Name**: whibo (or any name you prefer)
- **Environment**: Node
- **Region**: Choose the closest region to your users
- **Branch**: main (or your default branch)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### 5. Create Web Service

- Click **Create Web Service**
- Render will start deploying your application

### 6. Access Your Application

- Once deployed, Render will provide a URL like `https://whibo.onrender.com`
- Your WhiBO application is now live!

## Troubleshooting

### If Socket.IO Connections Fail

1. In your Render dashboard, go to your web service settings
2. Under the "Environment" tab, add the following environment variable:
   - Key: `CORS_ORIGIN`
   - Value: `*`
3. Click "Save Changes" and trigger a manual deploy

### If Your App Goes to Sleep

Render's free tier puts applications to sleep after 15 minutes of inactivity. To keep it running:

1. Use a service like [UptimeRobot](https://uptimerobot.com) (free) to ping your app
2. Create a new HTTP monitor with your app's URL
3. Set the monitoring interval to 5 minutes

## Upgrading (Optional)

If your app becomes popular and you need better performance:

1. In your Render dashboard, go to your web service
2. Under the "Settings" tab, find the "Plan" section
3. Upgrade to a paid plan based on your needs

Remember, the free tier has limitations but is perfect for testing or small-scale deployments.
