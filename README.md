# DockMind: AI-Powered Docking Data Management Agent

![Solana](https://img.shields.io/badge/Solana-3E484F?style=for-the-badge&logo=solana&logoColor=white)
![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)
![AI](https://img.shields.io/badge/AI-FF4F64?style=for-the-badge&logo=openai&logoColor=white)

An AI-driven system for managing, categorizing, and securely storing docking simulation data using **Solana blockchain** and **decentralized storage**.

https://github.com/user-attachments/assets/0cc5225e-484d-43a0-9854-c067d2b1ab95

## 🚀 Objective
Efficiently organize and manage docking simulation data (from commercial & open-source tools) to accelerate research in small-molecule inhibitors for target proteins.

## 🔑 Key Features

### 🤖 Automated Data Categorization & Tagging
- **Protein Targets**: Group by targeted proteins.
- **Binding Efficacy**: Categorize by affinity scores.
- **Molecular Properties**: Identify physicochemical & ADMET properties.

### ⛓️ Blockchain-Based Storage (Solana)
- **Immutable Records**: Smart contracts ensure data integrity.
- **Decentralized Storage**: IPFS/Arweave for files + Solana references.
- **Full Auditability**: Transparent data provenance.

### 🔍 Researcher-Friendly Interface
- **Search & Filter**: By protein, efficacy, or molecular traits.
- **Interactive Visualizations**:
  - Docking score distributions.
  - Molecular interaction heatmaps.
  - 3D docking previews.
- **Export/Integration**: Seamless ML model integration.

## 🛠️ Technical Workflow
1. **Data Ingestion**: Upload docking results → AI categorization.
2. **Blockchain Recording**: 
   - Metadata hashed on Solana.
   - Files stored on IPFS/Arweave.
3. **User Access**: Intuitive UI + real-time smart contract queries.


## 🛠️ Installation & Usage

1. Clone the repository:
   ```bash
   git clone {https://github.com/e-man07/DockMind}
   cd {DockMind}
   ```

2. Create and activate a virtual environment (Terminal 1):

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python src/run_api.py
   ```

5. Setup the frontend (Terminal 2):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. Access the application:
   ```bash
   Open your browser and navigate to http://localhost:3000.
   ```
