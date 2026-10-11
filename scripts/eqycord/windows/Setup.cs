// EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

public sealed class PayloadManifest {
    public string Build { get; set; }
    public Dictionary<string, string> Files { get; set; }
}

public static class Payload {
    public static string RecoveryBuild(string destination) {
        try { Extract(destination); return destination; }
        catch (IOException) {
            if (!Directory.Exists(destination)) throw;
            // Keep changed files for recovery and execute a fresh verified copy.
            var fresh = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(destination)), Manifest().Build + "-repair-" + Guid.NewGuid().ToString("N"));
            Extract(fresh);
            return fresh;
        }
    }
    public static ZipArchive Open(string resource = "EqyCord.Payload") {
        return new ZipArchive(Assembly.GetExecutingAssembly().GetManifestResourceStream(resource), ZipArchiveMode.Read);
    }
    public static PayloadManifest Manifest(string resource = "EqyCord.Payload") {
        using (var zip = Open(resource))
        using (var reader = new StreamReader(zip.GetEntry("manifest.json").Open()))
            return new JavaScriptSerializer().Deserialize<PayloadManifest>(reader.ReadToEnd());
    }
    public static string Digest(string path) {
        using (var sha = SHA256.Create())
        using (var input = File.OpenRead(path))
            return BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant();
    }
    public static void RejectLinks(string path) {
        var directory = new DirectoryInfo(path);
        while (directory != null) {
            if (directory.Exists && (directory.Attributes & FileAttributes.ReparsePoint) != 0)
                throw new IOException("The destination contains a directory link. Choose a normal folder.");
            directory = directory.Parent;
        }
    }
    public static void Extract(string destination, string resource = "EqyCord.Payload") {
        var root = Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        RejectLinks(root);
        Directory.CreateDirectory(root);
        var manifest = Manifest(resource);
        using (var zip = Open(resource)) {
            foreach (var entry in zip.Entries) {
                if (entry.FullName == "manifest.json") continue;
                if (!manifest.Files.ContainsKey(entry.FullName)) throw new IOException("Unexpected package file.");
                var target = Path.GetFullPath(Path.Combine(root, entry.FullName.Replace('/', Path.DirectorySeparatorChar)));
                if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new IOException("Unsafe package path.");
                RejectLinks(Path.GetDirectoryName(target));
                if (File.Exists(target)) {
                    if ((File.GetAttributes(target) & FileAttributes.ReparsePoint) != 0) throw new IOException("Destination file is a link.");
                    if (Digest(target) != manifest.Files[entry.FullName]) throw new IOException("Existing EqyCord files have changed. They were not overwritten.");
                    continue;
                }
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                var temporary = target + ".extracting";
                if (File.Exists(temporary)) {
                    if ((File.GetAttributes(temporary) & FileAttributes.ReparsePoint) != 0) throw new IOException("Temporary extraction file is a link.");
                    // A previous setup may have been closed during extraction.
                    // The final files remain protected by the payload manifest.
                    File.Delete(temporary);
                }
                using (var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write))
                using (var input = entry.Open()) input.CopyTo(output);
                if (Digest(temporary) != manifest.Files[entry.FullName]) {
                    File.Delete(temporary);
                    throw new IOException("Package checksum verification failed.");
                }
                File.Move(temporary, target);
            }
        }
        foreach (var file in manifest.Files) {
            var target = Path.GetFullPath(Path.Combine(root, file.Key));
            if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(target) || Digest(target) != file.Value)
                throw new IOException("Package is incomplete or damaged.");
        }
    }
}

public class SetupWindow : Form {
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
    protected override void OnHandleCreated(EventArgs args) {
        base.OnHandleCreated(args);
        int squareCorners = 1;
        // Windows 10 ignores this Windows 11 preference; both use no clip region.
        DwmSetWindowAttribute(Handle, 33, ref squareCorners, sizeof(int));
    }
    public const string CreatorProfileUrl = "https://discord.com/users/380070146317877249";
    public const string HelpUrl = "https://discord.gg/Kexjx2GH3B";
    readonly ComboBox channel = new ComboBox();
    readonly TextBox log = new TextBox();
    readonly Label status = new Label();
    readonly ProgressBar progress = new ProgressBar();
    readonly List<Button> buttons = new List<Button>();
    readonly string dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EqyCord");
    readonly PayloadManifest manifest = Payload.Manifest();
    protected bool busy;

    public SetupWindow() {
        Text = "EqyCord Setup";
        Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
        ClientSize = new Size(600, 425);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10);
        BackColor = Color.FromArgb(248, 249, 251);
        AddLabel("EqyCord", 24, 18, 550, 45, 24);
        AddLabel("Install your client, verify it, or restore original Discord files.", 26, 70, 548, 24, 10);
        AddLabel("Discord channel", 26, 110, 145, 24, 10);
        channel.SetBounds(181, 107, 210, 30);
        channel.DropDownStyle = ComboBoxStyle.DropDownList;
        channel.Items.AddRange(new object[] { "Stable", "PTB", "Canary" });
        channel.SelectedIndex = 0;
        Controls.Add(channel);
        AddButton("Install / Repair", 26, delegate { Run("repair"); });
        AddButton("Verify", 209, delegate { Run("verify"); });
        AddButton("Uninstall", 392, delegate { Run("uninstall"); });
        status.SetBounds(26, 202, 548, 27);
        status.Text = "Install / Repair and Restore automatically restart the selected Discord client.";
        Controls.Add(status);
        progress.SetBounds(26, 232, 548, 6);
        progress.Visible = false;
        progress.Style = ProgressBarStyle.Marquee;
        Controls.Add(progress);
        log.SetBounds(26, 250, 548, 100);
        log.Multiline = true;
        log.ReadOnly = true;
        log.ScrollBars = ScrollBars.Vertical;
        log.BackColor = Color.White;
        Controls.Add(log);
        var licenses = new LinkLabel { Text = "Licenses and complete source", Left = 26, Top = 360, Width = 280, Height = 24 };
        licenses.LinkClicked += delegate {
            ShowLicenses();
        };
        Controls.Add(licenses);
        var creator = new LinkLabel { Text = "Created by 0009cx0", Left = 340, Top = 360, Width = 234, Height = 24 };
        creator.LinkClicked += delegate { ShowCreator(); };
        Controls.Add(creator);
        AddLabel("Unofficial client mod. May conflict with Discord's Terms.", 26, 392, 480, 24, 9);
        var help = new LinkLabel { Text = "Help", Left = 520, Top = 392, Width = 54, Height = 24 };
        help.LinkClicked += delegate { ShowHelp(); };
        Controls.Add(help);
    }
    protected override void OnFormClosing(FormClosingEventArgs args) {
        if (busy) {
            args.Cancel = true;
            UpdateSurface("busy", "Please wait for the current operation to finish.", "");
        }
        base.OnFormClosing(args);
    }
    void AddLabel(string text, int x, int y, int w, int h, int size) {
        Controls.Add(new Label { Text = text, Left = x, Top = y, Width = w, Height = h, Font = new Font("Segoe UI", size) });
    }
    void AddButton(string text, int x, Action action) {
        var button = new Button { Text = text, Left = x, Top = 154, Width = 170, Height = 38 };
        button.Click += delegate { action(); };
        buttons.Add(button);
        Controls.Add(button);
    }
    string Branch() { return new string[] { "stable", "ptb", "canary" }[channel.SelectedIndex]; }
    string BuildPath() { return Path.Combine(dataRoot, "builds", manifest.Build); }
    public static string Quote(string value) { return "\"" + value.Replace("\"", "\\\"").TrimEnd('\\') + "\""; }
    protected void ShowLicenses() {
        if (busy) return;
        try { var build = BuildPath(); Payload.Extract(build); Process.Start("explorer.exe", Quote(build)); }
        catch (Exception error) { UpdateSurface("error", "Could not open licenses", error.Message); }
    }
    protected void ShowCreator() {
        if (busy) return;
        try { Process.Start(new ProcessStartInfo(CreatorProfileUrl) { UseShellExecute = true }); }
        catch (Exception error) { UpdateSurface("error", "Could not open the creator profile", error.Message); }
    }
    protected void ShowHelp() {
        if (busy) return;
        try { Process.Start(new ProcessStartInfo(HelpUrl) { UseShellExecute = true }); }
        catch (Exception error) { UpdateSurface("error", "Could not open Discord help", error.Message); }
    }
    protected virtual void UpdateSurface(string state, string title, string message) {
        status.Text = title;
        log.Text = message;
    }

    // Look up ownership in Discord itself, so restore still works after a new
    // setup executable is downloaded or Discord creates a new app directory.
    string OwnedProject(string location, out string appVersion) {
        appVersion = null;
        string project = null;
        if (!Directory.Exists(location)) throw new IOException("Install the selected Discord channel first.");
        foreach (var app in Directory.GetDirectories(location, "app-*")) {
            var state = Path.Combine(app, "resources", ".eqycord-install.json");
            if (!File.Exists(state)) continue;
            Payload.RejectLinks(Path.GetDirectoryName(state));
            var record = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(state));
            var candidate = Path.GetFullPath((string)record["project"]);
            var allowed = Path.GetFullPath(Path.Combine(dataRoot, "builds")) + Path.DirectorySeparatorChar;
            if (!candidate.StartsWith(allowed, StringComparison.OrdinalIgnoreCase))
                throw new IOException("This EqyCord installation belongs to another package. Use its original uninstaller.");
            if (project != null) throw new IOException("Several owned app versions exist. Restore them with the original installer before continuing.");
            project = candidate;
            appVersion = Path.GetFileName(app);
        }
        if (project == null) {
            var legacy = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "EqyCord");
            if (File.Exists(Path.Combine(legacy, "BUILD-UPDATE.json"))) {
                // The new CLI validates the exact legacy loader and renderer
                // checksum before verification, migration or restoration.
                foreach (var app in Directory.GetDirectories(location, "app-*")) {
                    if (!File.Exists(Path.Combine(app, "resources", "_app.asar"))) continue;
                    if (project != null) throw new IOException("Several patched versions exist. Restore older versions first.");
                    project = legacy; appVersion = Path.GetFileName(app);
                }
            }
        }
        return project;
    }
    void Run(string action) {
        RunAction(action, Branch());
    }
    protected void RunAction(string action, string branch) {
        if (busy) return;
        if (action != "install" && action != "repair" && action != "verify" && action != "uninstall") return;
        if (branch != "stable" && branch != "ptb" && branch != "canary") return;
        busy = true;
        channel.Enabled = false;
        foreach (var button in buttons) button.Enabled = false;
        progress.Visible = true;
        UpdateSurface("busy", action == "install" || action == "repair" ? "Installing or repairing EqyCord…" : action == "verify" ? "Verifying your installation…" : "Restoring Discord…", "Keep this window open until the operation finishes.");
        ThreadPool.QueueUserWorkItem(delegate {
            string message;
            bool success = false;
            try {
                string folder = new Dictionary<string, string> { { "stable", "Discord" }, { "ptb", "DiscordPTB" }, { "canary", "DiscordCanary" } }[branch];
                string location = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), folder);
                string version;
                string previous = OwnedProject(location, out version);
                if (action == "install") action = "repair";
                if (action != "repair" && previous == null)
                    throw new IOException("No installation owned by this setup was found. Existing mods were left unchanged.");
                string build = Payload.RecoveryBuild(BuildPath());
                Payload.RejectLinks(build);
                var start = new ProcessStartInfo(Path.Combine(build, "runtime", "node.exe"));
                start.Arguments = Quote(Path.Combine(build, "scripts", "eqycord", "installer.mjs")) + " " + action + " --branch " + branch + " --location " + Quote(location);
                if (previous != null) start.Arguments += " --previous-project " + Quote(previous) + " --app-version " + version;
                start.UseShellExecute = false;
                start.CreateNoWindow = true;
                start.RedirectStandardOutput = true;
                start.RedirectStandardError = true;
                start.WorkingDirectory = build;
                Action apply = delegate {
                using (var process = Process.Start(start)) {
                    string errors = "";
                    process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args) { if (args.Data != null) errors += args.Data + Environment.NewLine; };
                    process.BeginErrorReadLine();
                    string output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();
                    if (process.ExitCode != 0) throw new IOException(String.IsNullOrWhiteSpace(errors) ? output : errors);
                }
                };
                if (action == "verify") apply();
                else new DiscordLifecycle(location, branch).Apply(apply);
                success = true;
                message = action == "install" || action == "repair" ? "EqyCord installed or repaired. Discord is restarting.\r\nKeep the files in LocalAppData/EqyCord. You can delete the setup download."
                    : action == "uninstall" ? "Original Discord archive restored and verified. Discord is restarting. Your settings were preserved."
                    : "Installed EqyCord files and original Discord backup verified.";
            } catch (Exception error) { message = error.Message; }
            if (!IsDisposed) BeginInvoke(new Action(delegate {
                busy = false;
                UpdateSurface(success ? "success" : "error", success ? "All done." : "Action could not be completed", message);
                progress.Visible = false;
                channel.Enabled = true;
                foreach (var button in buttons) button.Enabled = true;
            }));
        });
    }
}

public static class Program {
    [STAThread]
    public static int Main(string[] args) {
        try {
            if (args.Length == 2 && args[0] == "--extract-only") {
                Payload.Extract(args[1]);
                return 0;
            }
            if (args.Length == 3 && args[0] == "--recovery-extraction-test") {
                File.WriteAllText(args[2], Payload.RecoveryBuild(args[1]));
                return 0;
            }
            UiBootstrap.Initialize();
            return UiBootstrap.Launch(args);
        } catch (Exception error) {
            if (args.Length == 2 && args[0] == "--ui-test") {
                Directory.CreateDirectory(args[1]);
                File.WriteAllText(Path.Combine(args[1], "error.txt"), error.ToString());
            }
            if (args.Length == 0) MessageBox.Show(error.Message, "EqyCord Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
