<?php

/**
 * Admin Register.
 */

namespace NJT\FastDup;

defined( 'ABSPATH' ) || exit;
class Admin {

	/**
	 * Instance of this class.
	 *
	 * @since    1.0
	 * @var      object
	 */
	protected static $instance = null;

	/**
	 * Return an instance of this class.
	 *
	 * @since     1.0
	 * @return    object    A single instance of this class.
	 */
	public static function get_instance() {
		if ( null == self::$instance ) {
			self::$instance = new self();
			self::$instance->do_hooks();
		}
		return self::$instance;
	}

	/**
	 * Init props
	 *
	 * @since     1.0
	 */
	private function __construct() {
	}

	private function do_hooks() {
		$meta_box = Admin\MetaBox::get_instance();
		add_action( 'admin_notices', array( $this, 'nginx_notice' ) );
		add_action( 'admin_notices', array( $this, 'htaccess_notice' ) );
		add_action( 'wp_ajax_fastdup_dismiss_notice', array( $this, 'handle_notice_dismiss' ) );
		add_action( 'admin_footer', array( $this, 'notice_script' ) );
	}

	public function notice_script() {
		?>
		<script type="text/javascript">
		function fastdupDismissNotice(type, btn) {
			btn.disabled = true;
			btn.classList.add('updating-message');
			fetch(ajaxurl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					action: 'fastdup_dismiss_notice',
					notice_type: type,
					_ajax_nonce: '<?php echo esc_js( wp_create_nonce( 'fastdup_dismiss_notice' ) ); ?>',
				}),
			}).then(function() {
				btn.closest('.notice').remove();
			});
		}
		</script>
		<?php
	}

	public function handle_notice_dismiss() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( null, 403 );
		}
		check_ajax_referer( 'fastdup_dismiss_notice' );
		$type = sanitize_key( $_POST['notice_type'] ?? '' );
		if ( in_array( $type, array( 'nginx', 'htaccess' ), true ) ) {
			update_option( 'fastdup_notice_dismissed_' . $type, '1' );
			wp_send_json_success();
		}
		wp_send_json_error( null, 400 );
	}

	public function nginx_notice() {
		$server_software = isset( $_SERVER['SERVER_SOFTWARE'] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) ) : '';
		if ( strpos( $server_software, 'nginx' ) === false ) {
			return;
		}
		if ( get_option( 'fastdup_notice_dismissed_nginx' ) === '1' ) {
			return;
		}

		$content_dir_rel = str_replace( ABSPATH, '', WP_CONTENT_DIR );
		$rule            = "location ~* /{$content_dir_rel}/njt-fastdup/ {\n    deny all;\n}";
		?>
		<div class="notice notice-error">
			<p>
				<strong>FastDup:</strong>
				<?php esc_html_e( 'Your server is running Nginx. To block direct access to backup files, please add the following rule to your Nginx server block config:', 'fastdup' ); ?>
			</p>
			<pre style="background:#f6f7f7;padding:10px;display:inline-block;"><?php echo esc_html( $rule ); ?></pre>
			<p>
				<button type="button" class="button button-secondary" onclick="fastdupDismissNotice('nginx', this)">
					<?php esc_html_e( 'Dismiss', 'fastdup' ); ?>
				</button>
			</p>
		</div>
		<?php
	}

	public function htaccess_notice() {
		$server_software = isset( $_SERVER['SERVER_SOFTWARE'] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) ) : '';
		if ( strpos( $server_software, 'nginx' ) !== false ) {
			return;
		}
		if ( get_option( 'fastdup_notice_dismissed_htaccess' ) === '1' ) {
			return;
		}

		$htaccess_path = Admin\Helper\Helper::safe_path_slash( NJT_FASTDUP_ARCHIVE_DIR_PATH ) . '/.htaccess';
		if ( file_exists( $htaccess_path ) ) {
			return;
		}
		?>
		<?php
		$htaccess_content = "Options -Indexes\n# Block direct HTTP access to all files\n<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order Allow,Deny\n    Deny from all\n</IfModule>";
		?>
		<div class="notice notice-error">
			<p>
				<strong>FastDup:</strong>
				<?php
				printf(
					/* translators: %s: .htaccess file path */
					esc_html__( 'Could not create the .htaccess file at %s to protect your backup files from direct access. Please check folder permissions or create it manually with the following content:', 'fastdup' ),
					'<code>' . esc_html( $htaccess_path ) . '</code>'
				);
				?>
			</p>
			<pre style="background:#f6f7f7;padding:10px;display:inline-block;"><?php echo esc_html( $htaccess_content ); ?></pre>
			<p>
				<button type="button" class="button button-secondary" onclick="fastdupDismissNotice('htaccess', this)">
					<?php esc_html_e( 'Dismiss', 'fastdup' ); ?>
				</button>
			</p>
		</div>
		<?php
	}
}
