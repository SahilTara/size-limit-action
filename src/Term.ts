import { exec } from "@actions/exec";
import hasYarn from "has-yarn";
import hasPNPM from "has-pnpm";

const INSTALL_STEP = "install";
const BUILD_STEP = "build";

class Term {
  /**
   * Autodetects and gets the current package manager for the current directory, either yarn, pnpm,
   * or npm. Default is `npm`.
   *
   * @param directory The current directory
   * @returns The detected package manager in use, one of `yarn`, `pnpm`, `npm`
   */
  getPackageManager(directory?: string): string {
    return hasYarn(directory) ? "yarn" : hasPNPM(directory) ? "pnpm" : "npm";
  }

  async execSizeLimit(
    branch?: string,
    skipStep?: string,
    buildScript?: string,
    cleanScript?: string,
    windowsVerbatimArguments?: boolean,
    directory?: string,
    script?: string,
    packageManager?: string,
    installScript?: string
  ): Promise<{ status: number; output: string }> {
    const manager = packageManager || this.getPackageManager(directory);
    let output = "";

    if (branch) {
      try {
        await exec(`git fetch origin ${branch}`);
      } catch (error) {
        console.log("Fetch failed", error.message);
      }

      await exec(`git checkout -f $(git merge-base ${branch} HEAD)`);
    }

    if (skipStep !== INSTALL_STEP && skipStep !== BUILD_STEP) {
      const installCommand = installScript
        ? installScript
        : `${manager} install`;
      await exec(installCommand, [], {
        cwd: directory
      });
    }

    if (skipStep !== BUILD_STEP) {
      const script = buildScript || "build";
      await exec(`${manager} run ${script}`, [], {
        cwd: directory
      });
    }

    const status = await exec(script, [], {
      windowsVerbatimArguments,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        }
      },
      cwd: directory
    });

    if (cleanScript) {
      await exec(`${manager} run ${cleanScript}`, [], {
        cwd: directory
      });
    }

    return {
      status,
      output
    };
  }
}

export default Term;
