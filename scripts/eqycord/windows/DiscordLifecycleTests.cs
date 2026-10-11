// EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;

public static class DiscordLifecycleTests {
    static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    public static int Main(string[] args) {
        if (args.Length > 0 && args[0] == "--processStart") {
            File.AppendAllText(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "restarts.txt"), args[1] + "\n");
            return 0;
        }
        if (args.Length > 0 && args[0] == "--fixture") { Thread.Sleep(Timeout.Infinite); return 0; }
        var processes = new List<Process>();
        try {
            string root = Path.Combine(Path.GetTempPath(), "eqycord-lifecycle-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            string self = Assembly.GetExecutingAssembly().Location;
            foreach (string branch in new [] { "stable", "ptb", "canary" }) {
                string image = branch == "stable" ? "Discord.exe" : branch == "ptb" ? "DiscordPTB.exe" : "DiscordCanary.exe";
                string selected = Path.Combine(root, branch);
                string app = Path.Combine(selected, "app-1.0.0");
                Directory.CreateDirectory(app);
                File.Copy(self, Path.Combine(selected, "Update.exe"));
                File.Copy(self, Path.Combine(app, image));
                string outside = Path.Combine(root, "other-" + branch);
                Directory.CreateDirectory(outside);
                File.Copy(self, Path.Combine(outside, image));
                var other = Process.Start(new ProcessStartInfo(Path.Combine(outside, image), "--fixture") { UseShellExecute = false, CreateNoWindow = true });
                processes.Add(other);
                var first = Process.Start(new ProcessStartInfo(Path.Combine(app, image), "--fixture") { UseShellExecute = false, CreateNoWindow = true });
                var child = Process.Start(new ProcessStartInfo(Path.Combine(app, image), "--fixture") { UseShellExecute = false, CreateNoWindow = true });
                processes.Add(first); processes.Add(child);
                Thread.Sleep(150);
                var lifecycle = new DiscordLifecycle(selected, branch);
                lifecycle.Apply(delegate {
                    Check(first.HasExited && child.HasExited, "All selected processes must exit before patching.");
                    Check(!other.HasExited, "Other installations must stay open.");
                });
                string marker = Path.Combine(selected, "restarts.txt");
                Check(File.ReadAllText(marker) == image + "\n", "Restart must select correct channel.");
                lifecycle.Apply(delegate { });
                Check(File.ReadAllLines(marker).Length == 2, "Closed Discord must start after install.");
                var failureProcess = Process.Start(new ProcessStartInfo(Path.Combine(app, image), "--fixture") { UseShellExecute = false, CreateNoWindow = true });
                processes.Add(failureProcess); Thread.Sleep(150);
                bool failed = false;
                try { lifecycle.Apply(delegate { throw new IOException("Fixture patch failure"); }); }
                catch (IOException error) { failed = error.Message == "Fixture patch failure"; }
                Check(failed && File.ReadAllLines(marker).Length == 3, "Failure must preserve error and reopen previously running Discord.");
                Check(!other.HasExited, "Failure must leave unrelated installation running.");
                Console.WriteLine("PASS: " + branch + " close-before-write, scoped processes, restart, closed-client launch and failure recovery.");
            }
            return 0;
        } catch (Exception error) { Console.Error.WriteLine(error); return 1; }
        finally {
            foreach (var process in processes) {
                try { if (!process.HasExited) { process.Kill(); process.WaitForExit(5000); } } catch (InvalidOperationException) { }
                process.Dispose();
            }
        }
    }
}
