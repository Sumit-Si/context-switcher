const { exec } = require("child_process");

// Command line arguments
const command = process.argv[2];
const migrationName = process.argv[3];

// Valid migration commands
const validCommands = ["create", "up", "down", "list", "prune"];
if (!validCommands.includes(command)) {
  console.error(`Invalid command: Command must be one of ${validCommands.join(', ')}`);
  process.exit(1);
}

const commandWithoutMigrationNameRequired = ["list", "prune"];
if (!commandWithoutMigrationNameRequired.includes(command)) {
  if (!migrationName && command !== "up" && command !== "down") {
    // Note: 'up' and 'down' can also be run without a name to run all/revert all
    console.error("Migration name is required for creating a migration");
    process.exit(1);
  }
}

function runNpmScript() {
  return new Promise((resolve, reject) => {
    let execCommand = ``;

    if (migrationName) {
      execCommand = `pnpm exec migrate ${command} ${migrationName}`;
    } else {
      execCommand = `pnpm exec migrate ${command}`;
    }

    // Run the ts-migrate-mongoose CLI
    const childProcess = exec(execCommand, (error, stdout) => {
      if (error) {
        reject(`Error running script: ${error}`);
      } else {
        resolve(stdout);
      }
    });

    // Pipe outputs so you can see them in real-time
    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
  });
}

// Example usage:
runNpmScript()
  .then(() => {
    console.log("Migration command completed successfully.");
  })
  .catch((error) => {
    console.error("Migration command failed:", error);
    process.exit(1);
  });
