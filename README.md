 CropAI: Regional Predictive Agriculture ERPCropAI is an advanced AI-driven Enterprise Resource Planning (ERP) system designed to transform traditional farming into Climate-Smart Agriculture. By combining real-time IoT telemetry with multi-modal Vision AI, the system doesn't just diagnose diseases—it predicts regional outbreaks before they happen.🚀 Core Features1. Multi-Modal AI Diagnostics (Vision)Powered by the Qwen3-VL 30B Vision model, CropAI analyzes crop imagery to identify diseases with high precision. It provides immediate, actionable treatment steps, acting as a digital agricultural pathologist in the palm of a farmer's hand.2. Regional Predictive Intelligence (Proactive)Utilizing DeepSeek V3.2, the system analyzes real-time IoT data (Temperature, Humidity, Soil Moisture) to detect "Environmental Disease Signatures."Risk Assessment: The AI identifies if conditions favor specific pathogens (e.g., high humidity + moderate temp = Late Blight risk).Regional Broadcast: Upon detecting a high-risk environment, the system automatically broadcasts prevention alerts to all registered farmers within the same geographical location (backed by PostgreSQL spatial logic).3. Smart Farm ERP DashboardReal-time Gauges: Visualized telemetry from IoT sensors.Personalized Insights: Context-aware recommendations based on user-specific crops.History Tracking: A MongoDB-backed history of all AI detections and environmental logs.🛠️ The Tech StackLayerTechnologyFrontendVanilla JavaScript (ES6+), HTML5, CSS3 (Mobile-First)BackendNode.js, Express.jsRelational DataPostgreSQL (User Accounts, Profiles, Regional Lookups)Non-Relational DataMongoDB (IoT Telemetry Logs, AI Scan History)AI ModelsFeatherless.ai (Qwen3-VL & DeepSeek V3.2)SecurityJWT (Stateless Auth), BcryptJS (Encryption)📦 Installation & SetupFollow these steps to deploy a local instance of CropAI.1. PrerequisitesNode.js (v20+)PostgreSQL (Port 5432)MongoDB (Local or Atlas)Featherless.ai API Key2. Clone & InstallBashgit clone https://github.com/lamartine587/CropAI-ERP-Final.git
cd CropAI-ERP-Final/Group_project/backend
npm install
3. Database Setup (PostgreSQL)Create a database named cropai_db and execute the following schema:SQLCREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE profiles (
    user_id INTEGER REFERENCES users(id),
    full_name VARCHAR(255),
    location VARCHAR(255),
    crops TEXT,
    avatar_url TEXT
);
4. Environment ConfigurationCreate a .env file in the backend folder:Code snippetPORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/cropai_db
MONGO_URI=mongodb://localhost:27017/cropai_iot
JWT_SECRET=your_jwt_secret_key
FEATHERLESS_API_KEY=your_api_key
5. Run the ApplicationBashnpm start
Access the dashboard at http://localhost:5000.🛡️ DevOps & Project StandardsClean Architecture: Uses a hybrid SQL/NoSQL approach to optimize for both ACID compliance (Users/Auth) and high-velocity data (IoT/AI Logs).Strict Git-Ignore: Excludes node_modules, .env, and OS-specific binaries to ensure a lightweight, platform-agnostic repository.Error Resiliency: Implements defensive AI parsing to handle non-JSON outputs from LLMs and API timeouts.
