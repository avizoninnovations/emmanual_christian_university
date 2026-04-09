pnpm -r exec tsc --noEmit

1. System Administrator
Email: admin@ecu-ssd.org
Password: Password123!

2. Lecturer (Staff Member)
Email: lecturer@ecu-ssd.org
Password: Password123!

http://127.0.0.1:6790

---

## Convex Local Environment Management

### Where are my local databases stored?
On Windows, Convex stories your local development databases in:
`C:\Users\Atiidu\.convex\anonymous-convex-backend-state\`

Each folder inside that directory corresponds to a `CONVEX_DEPLOYMENT` name you set in your `.env.local`. Right now, you only have one folder there (`anonymous-emmanual_christian_university`). The new one (`ecu-local-development`) hasn't been created yet because the server must fully boot up to create it!

### How do I delete old databases?
You don't need to use a command line argument. To clean up old databases and free up space:
1. Make sure your server (`turbo dev`) is **stopped**.
2. Go to `C:\Users\Atiidu\.convex\anonymous-convex-backend-state\` in your File Explorer. 
3. **Delete** any folder you no longer need. 

*(If you ever accidentally delete the folder of an active project, Convex will simply recreate a fresh, empty database the next time you run `convex dev`.)*

### Helpful Commands for Local Development

- **Start the local server & synchronize database:**
  ```bash
  npx convex dev --local
  ```
  *(This command pushes your functions to the backend. The frontend will crash if you try to visit it before this command finishes deploying!)*

- **Run a specific function (e.g. seeding the admin user):**
  ```bash
  npx convex run users:createStaff "{\"firstName\":\"System\",\"lastName\":\"Admin\",\"email\":\"admin@ecu.edu\",\"role\":\"SystemAdmin\",\"password\":\"Password123!\"}"

  pnpm --filter @workspace/backend exec npx convex run users:createStaff "{\"firstName\":\"System\",\"lastName\":\"Admin\",\"email\":\"admin@ecu.edu\",\"role\":\"SystemAdmin\",\"password\":\"Password123!\"}"


  ```

- **Open the local dashboard:**
  Your locally running Convex instance has its own UI where you can view data and run functions. While your server is running, open:
  [http://127.0.0.1:3211](http://127.0.0.1:3211)

- **Import/Export Data:**
  ```bash
  npx convex import my_table data.json
  npx convex export
  ```