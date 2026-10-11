// EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

public sealed class DiscordLifecycle {
    readonly string root, executable, updater;
    public DiscordLifecycle(string location, string branch) {
        root = Path.GetFullPath(location).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        executable = branch == "stable" ? "Discord.exe" : branch == "ptb" ? "DiscordPTB.exe" : branch == "canary" ? "DiscordCanary.exe" : null;
        if (executable == null) throw new ArgumentException("Unknown Discord channel.");
        updater = Path.Combine(root, "Update.exe");
        if (!File.Exists(updater)) throw new IOException("Discord's restart launcher is missing. Reinstall the selected Discord channel first.");
        RejectLinks(root.TrimEnd(Path.DirectorySeparatorChar));
        RejectLinks(updater);
    }
    static void RejectLinks(string path) {
        for (string current = path; !String.IsNullOrEmpty(current); current = Path.GetDirectoryName(current))
            if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new IOException("Discord paths must not contain symbolic links or junctions.");
    }
    bool Owns(Process process) {
        try {
            if (process.HasExited) return false;
            string path = Path.GetFullPath(process.MainModule.FileName);
            return path.StartsWith(root, StringComparison.OrdinalIgnoreCase) && String.Equals(Path.GetFileName(path), executable, StringComparison.OrdinalIgnoreCase);
        } catch (InvalidOperationException) { return false; }
        catch (System.ComponentModel.Win32Exception error) {
            throw new IOException("Could not inspect Discord. No installation files were changed.", error);
        }
    }
    bool Close() {
        bool wasRunning = false;
        var timer = Stopwatch.StartNew();
        while (true) {
            bool found = false;
            foreach (var process in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(executable))) {
                using (process) {
                    if (!Owns(process)) continue;
                    wasRunning = found = true;
                    if (timer.ElapsedMilliseconds < 1500) process.CloseMainWindow();
                    else {
                        try { process.Kill(); } catch (InvalidOperationException) { }
                        if (!process.WaitForExit(5000)) throw new IOException("Discord did not close. Installation was cancelled.");
                    }
                }
            }
            if (!found) return wasRunning;
            if (timer.ElapsedMilliseconds > 15000) throw new IOException("Discord keeps reopening. Installation was cancelled.");
            Thread.Sleep(100);
        }
    }
    void Restart() {
        var start = new ProcessStartInfo(updater, "--processStart " + executable) {
            WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden
        };
        using (var process = Process.Start(start)) {
            if (process == null) throw new IOException("Discord could not restart.");
            if (process.WaitForExit(1000) && process.ExitCode != 0)
                throw new IOException("Discord's restart launcher failed. Open Discord manually.");
        }
    }
    public void Apply(Action operation) {
        bool wasRunning = Close();
        try { operation(); }
        catch (Exception error) {
            if (wasRunning) {
                try { Restart(); }
                catch (Exception restartError) { throw new IOException(error.Message + "\r\nDiscord could not reopen: " + restartError.Message, error); }
            }
            throw;
        }
        Restart();
    }
}
