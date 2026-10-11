// EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public static class UiBootstrap {
    public static string DirectoryPath;
    public static string RuntimePath;
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string directory);
    public static byte[] Resource(string name) {
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (var output = new MemoryStream()) { stream.CopyTo(output); return output.ToArray(); }
    }
    public static void Initialize() {
        AppDomain.CurrentDomain.AssemblyResolve += delegate(object sender, ResolveEventArgs args) {
            string name = new AssemblyName(args.Name).Name;
            if (name != "Microsoft.Web.WebView2.Core" && name != "Microsoft.Web.WebView2.WinForms") return null;
            return Assembly.Load(Resource("EqyCord." + name));
        };
        var loader = Resource("EqyCord.WebView2Loader");
        string digest;
        using (var hash = SHA256.Create()) digest = BitConverter.ToString(hash.ComputeHash(loader)).Replace("-", "").ToLowerInvariant();
        DirectoryPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EqyCord", "setup-ui", digest);
        Payload.RejectLinks(DirectoryPath);
        Directory.CreateDirectory(DirectoryPath);
        var target = Path.Combine(DirectoryPath, "WebView2Loader.dll");
        if (File.Exists(target)) {
            if ((File.GetAttributes(target) & FileAttributes.ReparsePoint) != 0 || Payload.Digest(target) != digest)
                throw new IOException("The setup's UI library was modified. Restore it before continuing.");
        } else {
            using (var stream = new FileStream(target, FileMode.CreateNew, FileAccess.Write)) stream.Write(loader, 0, loader.Length);
        }
        if (!SetDllDirectory(DirectoryPath)) throw new IOException("Could not initialize the setup's UI library.");
    }
    public static void ExtractRuntime() {
        RuntimePath = Path.Combine(DirectoryPath, "runtime-" + Payload.Manifest("EqyCord.WebRuntime").Build);
        Payload.Extract(RuntimePath, "EqyCord.WebRuntime");
    }
    [MethodImpl(MethodImplOptions.NoInlining)]
    public static int Launch(string[] args) {
        bool smoke = args.Length == 1 && args[0] == "--ui-smoke";
        bool native = args.Length == 1 && args[0] == "--native-smoke";
        string report = args.Length == 2 && args[0] == "--ui-test" ? Path.GetFullPath(args[1]) : null;
        if (args.Length != 0 && !smoke && !native && report == null) return 2;
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        if (native) {
            using (var window = new SetupWindow()) {
                window.Opacity = 0; window.ShowInTaskbar = false;
                var timer = new Timer { Interval = 250 };
                window.Shown += delegate { timer.Start(); };
                timer.Tick += delegate { timer.Stop(); window.Close(); };
                window.FormClosed += delegate { timer.Dispose(); };
                Application.Run(window);
            }
            return 0;
        }
        using (var window = new MeshSetupWindow(smoke || report != null, report)) {
            Application.Run(window);
            return window.TestFailed ? 1 : 0;
        }
    }
}

public sealed class MeshSetupWindow : SetupWindow {
    WebView2 surface;
    readonly LoadingSurface loading = new LoadingSurface();
    readonly bool testing;
    readonly string report;
    bool ready;
    string surfaceUri;
    string lastTestRequest;
    public bool TestFailed;
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr handle, int message, IntPtr wparam, IntPtr lparam);
    readonly JavaScriptSerializer json = new JavaScriptSerializer();

    public MeshSetupWindow(bool testing, string report) {
        this.testing = testing; this.report = report;
        ClientSize = new Size(920, 600);
        loading.Dock = DockStyle.Fill; Controls.Add(loading); loading.BringToFront();
        if (testing) { Opacity = 0; ShowInTaskbar = false; }
        Shown += delegate {
            if (report != null) {
                Directory.CreateDirectory(report);
                using (var bitmap = new Bitmap(loading.Width, loading.Height)) {
                    loading.DrawToBitmap(bitmap, loading.ClientRectangle);
                    bitmap.Save(Path.Combine(report, "loading.png"), System.Drawing.Imaging.ImageFormat.Png);
                }
            }
            InitializeSurface();
        };
    }
    async void InitializeSurface() {
        try {
            busy = true;
            foreach (Control control in Controls) control.Enabled = false;
            base.UpdateSurface("busy", "Preparing the redesigned interface…", "The first launch extracts a private graphics runtime. Your Discord files are not changed.");
            // All PCs use the same tested private runtime; no system runtime install,
            // browser update, network download, or administrator prompt is needed.
            await Task.Run(new Action(UiBootstrap.ExtractRuntime));
            surface = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(220, 220, 216) };
            Controls.Add(surface); surface.BringToFront();
            var environment = await CoreWebView2Environment.CreateAsync(UiBootstrap.RuntimePath, Path.Combine(UiBootstrap.DirectoryPath, "browser-data"));
            await surface.EnsureCoreWebView2Async(environment);
            surface.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            surface.CoreWebView2.Settings.AreDevToolsEnabled = false;
            surface.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
            surface.CoreWebView2.Settings.IsStatusBarEnabled = false;
            surface.CoreWebView2.Settings.IsZoomControlEnabled = false;
            surface.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs args) { args.Handled = true; };
            surface.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs args) {
                if (args.Uri != "about:blank" && args.Uri != surfaceUri) args.Cancel = true;
            };
            surface.CoreWebView2.WebMessageReceived += Message;
            surface.CoreWebView2.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs args) {
                if (!args.IsSuccess) { SurfaceFailure("The setup surface could not be loaded: " + args.WebErrorStatus); return; }
                ready = true;
                Controls.Remove(loading); loading.Dispose();
                if (testing) {
                    try {
                        await Task.Delay(350);
                        string value = await surface.ExecuteScriptAsync("JSON.stringify({title:document.title,buttons:document.querySelectorAll('[data-action]').length,mesh:window.meshStatus})");
                        if (value.IndexOf("EqyCord Setup", StringComparison.Ordinal) < 0 || value.IndexOf("starting", StringComparison.Ordinal) >= 0)
                            throw new IOException("The setup surface did not initialize.");
                        if (report != null) await TestSurface();
                    } catch (Exception error) {
                        TestFailed = true;
                        if (report != null) { Directory.CreateDirectory(report); File.WriteAllText(Path.Combine(report, "error.txt"), error.ToString()); }
                    }
                    Close();
                }
            };
            ClientSize = new Size(920, 600);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            Region = null;
            CenterToScreen();
            var html = UiBootstrap.Resource("EqyCord.Surface");
            surfaceUri = "data:text/html;charset=utf-8;base64," + Convert.ToBase64String(html);
            surface.NavigateToString(Encoding.UTF8.GetString(html));
            busy = false;
            foreach (Control control in Controls) control.Enabled = true;
        } catch (Exception error) { SurfaceFailure(error.Message); }
    }
    void SurfaceFailure(string message) {
        busy = false;
        foreach (Control control in Controls) control.Enabled = true;
        ready = false;
        Controls.Remove(loading); loading.Dispose();
        if (surface != null) { Controls.Remove(surface); surface.Dispose(); surface = null; }
        Region = null; FormBorderStyle = FormBorderStyle.FixedDialog; ClientSize = new Size(600, 425); CenterToScreen();
        base.UpdateSurface("ready", "Standard setup interface", "The animated surface is unavailable. You can still install, verify, or restore here.\r\n" + message);
        if (testing) {
            TestFailed = true;
            if (report != null) { Directory.CreateDirectory(report); File.WriteAllText(Path.Combine(report, "error.txt"), message); }
            Close();
        }
    }
    void Message(object sender, CoreWebView2WebMessageReceivedEventArgs args) {
        if (!ready || (args.Source != "about:blank" && args.Source != surfaceUri) || args.WebMessageAsJson.Length > 1024) return;
        try {
            var request = json.Deserialize<Dictionary<string, string>>(args.WebMessageAsJson);
            string action;
            if (!request.TryGetValue("action", out action)) return;
            // Test runs cannot invoke patching, file extraction, or Explorer through the UI.
            if (testing) { lastTestRequest = args.WebMessageAsJson; return; }
            if (action == "close") { Close(); return; }
            if (action == "minimize") { WindowState = FormWindowState.Minimized; return; }
            if (action == "drag") { ReleaseCapture(); SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero); return; }
            if (action == "licenses") { ShowLicenses(); return; }
            if (action == "creator") { ShowCreator(); return; }
            if (action == "help") { ShowHelp(); return; }
            string branch;
            if (request.TryGetValue("branch", out branch)) RunAction(action, branch);
        } catch (Exception error) { UpdateSurface("error", "Action could not be completed", error.Message); }
    }
    protected override async void UpdateSurface(string state, string title, string message) {
        base.UpdateSurface(state, title, message);
        if (!ready || surface == null || IsDisposed) return;
        try { await surface.ExecuteScriptAsync("window.setState(" + json.Serialize(state) + "," + json.Serialize(title) + "," + json.Serialize(message) + ")"); }
        catch { /* Native fallback remains available if the web surface closes. */ }
    }
    async Task CaptureSurface(string name) {
        await Task.Delay(150);
        using (var stream = File.Create(Path.Combine(report, name + ".png")))
            await surface.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
    }
    async Task TestSurface() {
        Directory.CreateDirectory(report);
        var results = new Dictionary<string, object>();
        results["squareWindow"] = Region == null;
        results["nativeTitleBar"] = FormBorderStyle == FormBorderStyle.FixedDialog && Text == "EqyCord Setup" && Icon != null;
        results["noDuplicateWindowControls"] = await ReadJson("document.querySelectorAll(\".window-actions\").length === 0");
        results["initial"] = await ReadJson("{mesh:meshStatus,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight}");
        string shader = await surface.ExecuteScriptAsync("meshStatus.mode");
        if (shader != "\"animated\"" && shader != "\"reduced-motion\"") throw new IOException("The WebGL shader did not render: " + shader);
        await CaptureSurface("setup");
        await surface.ExecuteScriptAsync("document.querySelector('[data-action=creator]').click()");
        await Task.Delay(80);
        if (lastTestRequest == null || json.Deserialize<Dictionary<string, string>>(lastTestRequest)["action"] != "creator")
            throw new IOException("The creator profile link did not reach the native bridge.");
        results["creatorLink"] = new Dictionary<string, string> { { "action", "creator" }, { "url", CreatorProfileUrl } };
        lastTestRequest = null;
        await surface.ExecuteScriptAsync("document.querySelector('[data-action=help]').click()");
        await Task.Delay(80);
        if (lastTestRequest == null || json.Deserialize<Dictionary<string, string>>(lastTestRequest)["action"] != "help")
            throw new IOException("The Discord help link did not reach the native bridge.");
        results["helpLink"] = new Dictionary<string, string> { { "action", "help" }, { "url", HelpUrl } };
        await surface.ExecuteScriptAsync("document.querySelector('[data-channel=canary]').click();document.querySelector('[data-action=install]').click()");
        await Task.Delay(80);
        if (lastTestRequest == null || lastTestRequest.IndexOf("canary", StringComparison.Ordinal) < 0 || lastTestRequest.IndexOf("install", StringComparison.Ordinal) < 0)
            throw new IOException("The native action bridge did not receive the selected client.");
        results["bridge"] = json.Deserialize<object>(lastTestRequest);
        string result = await surface.ExecuteScriptAsync(@"(()=>{
            window.__testRequests=[];
            document.querySelector('[data-channel=canary]').click();
            document.querySelector('[data-action=install]').click();
            document.querySelector('[data-action=verify]').click();
            document.querySelector('[data-action=uninstall]').click();
            if(__testRequests.length!==3||__testRequests.some(x=>x.branch!=='canary'))throw Error('Channel/action mismatch');
            setState('busy','Installing EqyCord…','Keep this window open until the operation finishes.');
            document.querySelector('[data-action=install]').click();
            if(__testRequests.length!==3||[...document.querySelectorAll('button')].some(x=>!x.disabled))throw Error('Busy controls must be locked');
            setState('error','Action could not be completed','Install the selected Discord channel first.');
            if([...document.querySelectorAll('button')].some(x=>x.disabled))throw Error('Retry must be enabled');
            if(document.querySelector('#status-message').textContent!=='Install the selected Discord channel first.')throw Error('Error missing');
            document.querySelector('[data-channel=stable]').click();
            document.querySelector('[data-channel=stable]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
            if(document.querySelector('[aria-checked=true]').dataset.channel!=='ptb')throw Error('Keyboard channel navigation');
            return 'PASS: actions, selected channel, busy lock, errors, keyboard navigation';
        })()");
        if (result.IndexOf("PASS:", StringComparison.Ordinal) < 0) throw new IOException("UI interaction tests failed: " + result);
        results["controls"] = result;
        await CaptureSurface("error");
        await surface.ExecuteScriptAsync("setState('success','All done.','EqyCord installed. Open the selected Discord client.');");
        await CaptureSurface("success");
        await surface.ExecuteScriptAsync("meshTest.reduce(false);window.dispatchEvent(new PointerEvent('pointermove',{clientX:innerWidth*.7,clientY:innerHeight*.4}));");
        await Task.Delay(300);
        string raised = await surface.ExecuteScriptAsync("meshStatus.intensity");
        double intensity = json.Deserialize<double>(raised);
        if (intensity <= .1 || intensity >= 1) throw new IOException("Pointer intensity did not rise smoothly.");
        results["animation"] = await ReadJson("meshStatus");
        await surface.ExecuteScriptAsync("document.documentElement.dispatchEvent(new PointerEvent('pointerleave'))");
        await Task.Delay(250);
        if (json.Deserialize<double>(await surface.ExecuteScriptAsync("meshStatus.intensity")) >= intensity)
            throw new IOException("Pointer intensity did not relax after leaving.");
        await surface.ExecuteScriptAsync("setState('ready','');meshTest.reduce(true)");
        await Task.Delay(120);
        string before = await surface.ExecuteScriptAsync("meshStatus.frames");
        await Task.Delay(160);
        string after = await surface.ExecuteScriptAsync("meshStatus.frames");
        if (before != after) throw new IOException("Reduced motion kept animating.");
        results["reducedMotion"] = await ReadJson("meshStatus");
        await CaptureSurface("reduced-motion");
        await surface.ExecuteScriptAsync("meshTest.fallback()");
        results["fallback"] = await ReadJson("{mode:meshStatus.mode,visible:getComputedStyle(document.querySelector('.ground')).display!=='none'}");
        await CaptureSurface("fallback");
        File.WriteAllText(Path.Combine(report, "results.json"), json.Serialize(results));
    }
    async Task<object> ReadJson(string expression) {
        string encoded = await surface.ExecuteScriptAsync("JSON.stringify(" + expression + ")");
        return json.Deserialize<object>(json.Deserialize<string>(encoded));
    }
}

public sealed class LoadingSurface : Control {
    public LoadingSurface() { DoubleBuffered = true; }
    static void Phantom(Graphics graphics, float x, float y, float size) {
        var state = graphics.Save();
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.TranslateTransform(x, y); graphics.ScaleTransform(size / 56, size / 56); graphics.TranslateTransform(-4, -3);
        using (var path = new GraphicsPath())
        using (var fill = new SolidBrush(Color.FromArgb(39,40,43)))
        using (var eyes = new Pen(Color.White, 3.5f)) {
            path.AddLine(12,50,12,28); path.AddBezier(12,28,12,15,20,7,32,7);
            path.AddBezier(32,7,44,7,52,15,52,28); path.AddLine(52,28,52,50);
            path.AddBezier(52,50,52,53,49,54,47,52); path.AddLine(47,52,40,46);
            path.AddLine(40,46,34,53); path.AddBezier(34,53,33,55,31,55,30,53);
            path.AddLine(30,53,24,46); path.AddLine(24,46,17,52);
            path.AddBezier(17,52,15,54,12,53,12,50); path.CloseFigure();
            graphics.FillPath(fill, path);
            eyes.StartCap = LineCap.Round; eyes.EndCap = LineCap.Round;
            graphics.DrawLine(eyes,22,28,29,31); graphics.DrawLine(eyes,42,28,35,31);
        }
        graphics.Restore(state);
    }
    protected override void OnPaint(PaintEventArgs args) {
        using (var brush = new LinearGradientBrush(ClientRectangle, Color.FromArgb(220,220,216), Color.FromArgb(232,213,206), 25)) args.Graphics.FillRectangle(brush, ClientRectangle);
        args.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
        using (var title = new Font("Segoe UI", 24, FontStyle.Bold))
        using (var body = new Font("Segoe UI", 11))
        using (var ink = new SolidBrush(Color.FromArgb(39,40,43))) {
            Phantom(args.Graphics, 38, 32, 34);
            args.Graphics.DrawString("EqyCord", title, ink, 78, 30);
            Phantom(args.Graphics, Width - 260, Height/2 - 95, 180);
            args.Graphics.DrawString("Getting things ready…", title, ink, 38, Height/2-35);
            args.Graphics.DrawString("Preparing your private graphics runtime.\nYour Discord files are not changed during this step.", body, ink, 40, Height/2+17);
        }
    }
}
