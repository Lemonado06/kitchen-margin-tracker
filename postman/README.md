# Postman API tests

| File | What it is |
|---|---|
| `KitchenMarginTracker.postman_collection.json` | 64 requests in 11 folders, each with tests, a description and a saved example response |
| `KitchenMarginTracker.local.postman_environment.json` | Sets `baseUrl` to `http://localhost:5000` |
| `report/test-report.html` | HTML report of the last full run (64 requests, 100 assertions, 0 failures; the exact assertion count depends on whether the AI answered the chat requests). Open it in a browser |

## Run it in Postman

1. Start the backend: `cd backend && npm run dev`.
2. In Postman, **Import** both JSON files.
3. Pick **Kitchen Margin Tracker - Local** in the environment dropdown (top right).
4. Right-click the collection → **Run collection** → **Run Kitchen Margin Tracker API**.

The run registers a fresh owner, saves the JWT into the `token` variable, adds a manager, checks each role rule, verifies the margin maths, asks the AI assistant, and deletes everything it created. You can also open any single request and click **Send**. Run **1. Auth → Login owner** first so `{{token}}` is set. The **Examples** dropdown on each request shows a real response from a test run.

## Run it from the command line

```bash
npx newman run postman/KitchenMarginTracker.postman_collection.json -e postman/KitchenMarginTracker.local.postman_environment.json

# with the HTML report
npm i -g newman newman-reporter-htmlextra
newman run postman/KitchenMarginTracker.postman_collection.json -e postman/KitchenMarginTracker.local.postman_environment.json -r cli,htmlextra --reporter-htmlextra-export postman/report/test-report.html
```

## Folders

| Folder | Covers |
|---|---|
| 0. Health | API and MongoDB are up |
| 1. Auth | Owner sign-up, login, rejected manager sign-up, duplicate email, wrong password, missing token |
| 2. Users & roles | Profile, password change, add / list / edit managers, managers blocked from team management |
| 3. Platforms | List, add, duplicate name, rename, delete; managers blocked |
| 4. Outlets | CRUD, managers see the owner's outlets, bad ids |
| 5. Dishes & recipe costs | Dishes and ingredient costs; managers can add but not delete |
| 6. Fee rules | Commission and GST per platform; duplicates and >100% rejected |
| 7. Orders | CRUD, dish must belong to the outlet, dates as YYYY-MM-DD |
| 8. Dashboard | KPIs and margin maths; date and dish filters |
| 9. AI assistant | Multi-tool question, follow-up with conversation history, filtered question, insight cards, validation and ownership checks |
| 10. Cleanup | Deletes the test data; a removed manager is locked out |

The AI chat requests need `GROQ_API_KEY` (or `GEMINI_API_KEY`). When every model is busy or out of quota, the API answers **503** with a "busy" message, and the tests accept that. `/ai/insights` always answers 200: the AI writes the cards when it's available, otherwise they are calculated from the same numbers (`source: "computed"`).
