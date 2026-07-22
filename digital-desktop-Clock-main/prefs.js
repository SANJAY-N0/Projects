import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const TIMEZONES = [
    "Local", "UTC", "America/New_York", "Europe/London", 
    "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"
];

export default class DesktopDigitalClockPreferences extends ExtensionPreferences {
    _getConfigFile() {
        return GLib.build_filenamev([GLib.get_user_config_dir(), 'desktop-digital-clock.json']);
    }

    fillPreferencesWindow(window) {
        let config = this._loadConfig();
        let page = new Adw.PreferencesPage();
        let mainGroup = new Adw.PreferencesGroup({ title: "Clock Customization Settings" });

        // Timezone Selector Row
        let tzRow = new Adw.ComboRow({
            title: "World Clock Timezone",
            subtitle: "Select a country or region timeline to display inside the widget window.",
            model: Gtk.StringList.new(TIMEZONES),
            selected: Math.max(TIMEZONES.indexOf(config.timezone || "Local"), 0)
        });
        tzRow.connect('notify::selected', (widget) => {
            this._updateConfig('timezone', TIMEZONES[widget.selected]);
        });
        mainGroup.add(tzRow);

        // Top Label Entry Row
        let topTextRow = new Adw.EntryRow({
            title: "Top Label Text",
            text: config.top_text ?? "CT"
        });
        topTextRow.connect('changed', (entry) => {
            this._updateConfig('top_text', entry.get_text());
        });
        mainGroup.add(topTextRow);

        // Bottom Label Entry Row
        let bottomTextRow = new Adw.EntryRow({
            title: "Bottom Label Text",
            text: config.bottom_text ?? "+9"
        });
        bottomTextRow.connect('changed', (entry) => {
            this._updateConfig('bottom_text', entry.get_text());
        });
        mainGroup.add(bottomTextRow);

        // Text Size Spin Button Row
        let sizeRow = new Adw.ActionRow({ 
            title: "Clock Number Text Size", 
            subtitle: "Increase or decrease the font size scale layout of the central time numbers." 
        });
        let sizeAdjustment = new Gtk.Adjustment({
            lower: 16,
            upper: 72,
            step_increment: 1,
            value: config.font_size || 32
        });
        let sizeSpinner = new Gtk.SpinButton({
            adjustment: sizeAdjustment,
            valign: Gtk.Align.CENTER,
            climb_rate: 1,
            digits: 0
        });
        sizeSpinner.connect('value-changed', (widget) => {
            this._updateConfig('font_size', widget.get_value_as_int());
        });
        sizeRow.add_suffix(sizeSpinner);
        mainGroup.add(sizeRow);

        // Light/Dark Theme Toggle Row (Fixed Signal to notify::active)
        let bgRow = new Adw.ActionRow({ title: "Light Card Mode Theme", subtitle: "Switch between clean Light or Slate Dark theme frames." });
        let bgSwitch = new Gtk.Switch({ active: config.bg_is_white, valign: Gtk.Align.CENTER });
        bgSwitch.connect('notify::active', (widget) => { 
            this._updateConfig('bg_is_white', widget.active); 
        });
        bgRow.add_suffix(bgSwitch);
        mainGroup.add(bgRow);

        // 24-Hour Toggle Row (Fixed Signal to notify::active)
        let formatRow = new Adw.ActionRow({ title: "24-Hour Time Format", subtitle: "Toggle standard military 24-hour display notation metrics." });
        let formatSwitch = new Gtk.Switch({ active: config.is_24h, valign: Gtk.Align.CENTER });
        formatSwitch.connect('notify::active', (widget) => { 
            this._updateConfig('is_24h', widget.active); 
        });
        formatRow.add_suffix(formatSwitch);
        mainGroup.add(formatRow);

        // Drag-and-Drop Toggle Row (Fixed Signal to notify::active)
        let dragRow = new Adw.ActionRow({ title: "Enable Drag-and-Drop Mode", subtitle: "Turn ON to move the clock widget anywhere on screen. Turn OFF to lock it down." });
        let dragSwitch = new Gtk.Switch({ active: config.drag_mode, valign: Gtk.Align.CENTER });
        dragSwitch.connect('notify::active', (widget) => { 
            this._updateConfig('drag_mode', widget.active); 
        });
        dragRow.add_suffix(dragSwitch);
        mainGroup.add(dragRow);

        page.add(mainGroup);

        // --- SHORTCUT UTILITIES ---
        let utilityGroup = new Adw.PreferencesGroup({ title: "Applications Shortcuts" });
        let launchRow = new Adw.ActionRow({ title: "Open Desktop Clocks App", subtitle: "Launch native GNOME Clocks manager to configure alarms or world profiles." });
        
        let launchBtn = new Gtk.Button({ 
            label: "Launch App", 
            valign: Gtk.Align.CENTER, 
            css_classes: ["suggested-action"] 
        });
        launchBtn.connect('clicked', () => {
            try {
                let appInfo = Gio.AppInfo.create_from_commandline('gnome-clocks', null, Gio.AppInfoCreateFlags.NONE);
                if (appInfo) appInfo.launch([], null);
            } catch (e) {}
        });
        launchRow.add_suffix(launchBtn);
        utilityGroup.add(launchRow);
        page.add(utilityGroup);

        // --- SUPPORT LINKS ---
        let supportGroup = new Adw.PreferencesGroup({ title: "Feedback & Repositories" });
        
        let contactRow = new Adw.ActionRow({ title: "Developer Contact Email", subtitle: "Submit bug report feedback or styling feature requests directly." });
        let emailLabel = new Gtk.Label({ label: "sanjay@sanjay.com", selectable: true, valign: Gtk.Align.CENTER });
        contactRow.add_suffix(emailLabel);
        supportGroup.add(contactRow);

        let gitRow = new Adw.ActionRow({ title: "Project GitHub Repository", subtitle: "Contribute to updates or review development branches online." });
        let gitBtn = new Gtk.Button({ label: "Open Repository", valign: Gtk.Align.CENTER });
        gitBtn.connect('clicked', () => { 
            try {
                Gio.AppInfo.launch_default_for_uri("https://github.com/SANJAY-N0/desktop-digital-clock", null); 
            } catch (e) {}
        });
        gitRow.add_suffix(gitBtn);
        supportGroup.add(gitRow);

        page.add(supportGroup);
        window.add(page);
    }

    _loadConfig() {
        try {
            let [success, contents] = GLib.file_get_contents(this._getConfigFile());
            if (success) return JSON.parse(new TextDecoder().decode(contents));
        } catch (e) {}
        return { bg_is_white: false, is_24h: false, drag_mode: true, timezone: "Local", font_size: 32, top_text: "CT", bottom_text: "+9", x: -1, y: -1 };
    }

    _updateConfig(key, value) {
        try {
            let config = this._loadConfig();
            config[key] = value; 
            GLib.file_set_contents(this._getConfigFile(), JSON.stringify(config, null, 2));
        } catch (e) {}
    }
}