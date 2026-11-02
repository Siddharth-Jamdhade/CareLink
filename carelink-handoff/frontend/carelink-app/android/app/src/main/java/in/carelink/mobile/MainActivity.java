package in.carelink.mobile;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import android.graphics.Color;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.ScrollView;
import android.text.InputType;

/** Only a trusted HTTPS origin is persisted. Credentials remain in HttpOnly cookies. */
public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        String configured = CapConfig.loadDefault(this).getServerUrl();
        String origin = getPreferences(MODE_PRIVATE).getString("care_server", "");
        if (configured != null && configured.startsWith("https://")) {
            super.load();
        } else if (!origin.isEmpty()) {
            connect(origin);
        } else {
            showSetup();
        }
    }

    private void connect(String origin) {
        config = new CapConfig.Builder(this).setServerUrl(origin + "/mobile")
            .setAndroidScheme("https").setAllowMixedContent(false)
            .setBackgroundColor("#fafbf7").create();
        setContentView(com.getcapacitor.android.R.layout.capacitor_bridge_layout_main);
        super.load();
    }

    private void showSetup() {
        int padding = (int) (28 * getResources().getDisplayMetrics().density);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(padding, padding * 2, padding, padding);
        layout.setBackgroundColor(Color.rgb(250, 251, 247));
        TextView title = new TextView(this);
        title.setText("CareLink\nConnect to your care team");
        title.setTextSize(28); title.setTextColor(Color.rgb(20, 89, 79));
        layout.addView(title);
        TextView description = new TextView(this);
        description.setText("Enter the secure care-server address supplied by your care team. Your sign-in details and records will be sent to this server. Check the address with them before continuing.\n\nHTTPS server address");
        description.setTextSize(16); description.setPadding(0, padding, 0, padding / 2);
        description.setTextColor(Color.rgb(35, 65, 57));
        layout.addView(description);
        EditText address = new EditText(this);
        address.setHint("https://your-care-server.example");
        address.setTextColor(Color.rgb(23, 63, 57));
        address.setHintTextColor(Color.rgb(90, 110, 100));
        address.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(20, 89, 79)));
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setSingleLine(true);
        address.setContentDescription("HTTPS care-server address");
        layout.addView(address, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        TextView error = new TextView(this); error.setTextColor(Color.rgb(150, 50, 30)); layout.addView(error);
        Button connect = new Button(this); connect.setText("Connect securely"); layout.addView(connect);
        connect.setTextColor(Color.WHITE);
        connect.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(20, 89, 79)));
        connect.setOnClickListener(view -> {
            String raw = address.getText().toString().trim();
            Uri url = Uri.parse(raw);
            if (!"https".equals(url.getScheme()) || url.getHost() == null || url.getUserInfo() != null || url.getQuery() != null || url.getFragment() != null || (url.getPath() != null && !url.getPath().isEmpty() && !"/".equals(url.getPath()))) {
                error.setText("Enter an HTTPS server address without a page path, password or query.");
                return;
            }
            String origin = "https://" + url.getEncodedAuthority();
            getPreferences(MODE_PRIVATE).edit().putString("care_server", origin).apply();
            connect(origin);
        });
        TextView help = new TextView(this);
        help.setText("You need an account linked by your care team. To change this server later, sign out and clear CareLink’s app storage in Android Settings. No camera or notification permission is requested here.");
        help.setTextSize(14); help.setPadding(0, padding, 0, 0); layout.addView(help);
        help.setTextColor(Color.rgb(70, 92, 80));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(layout);
        setContentView(scroll);
    }
}
