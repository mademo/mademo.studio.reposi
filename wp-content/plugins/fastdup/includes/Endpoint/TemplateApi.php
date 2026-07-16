<?php
namespace NJT\FastDup\Endpoint;

use NJT\FastDup\Admin\Database\Database;
use NJT\FastDup\Admin\Helper\PackageHelper;
use NJT\FastDup\Admin\Helper\DirectoryHelper;
use NJT\FastDup\Admin\Template;

defined( 'ABSPATH' ) || exit;
class TemplateApi {
	/**
	 * Instance of this class.
	 *
	 * @since    0.8.1
	 * @var      object
	 */
	protected static $instance = null;

	/**
	 * Return an instance of this class.
	 *
	 * @since     0.8.1
	 *
	 * @return    object    A single instance of this class.
	 */
	public static function get_instance() {

		// If the single instance hasn't been set, set it now.
		if ( null == self::$instance ) {
			self::$instance = new self();
			self::$instance->do_hooks();
		}

		return self::$instance;
	}

	/**
	 * Initialize the plugin by setting localization and loading public scripts
	 * and styles.
	 *
	 * @since     0.8.1
	 */
	private function __construct() {
	}

	/**
	 * Set up WordPress hooks and filters
	 *
	 * @return void
	 */
	public function do_hooks() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register the routes for the objects of the controller.
	 */
	public function register_routes() {
		$namespace = 'njt-fastdup/v1';

		register_rest_route(
			$namespace,
			'/template',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'list_template' ),
					'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'add' ),
					'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
				),
			)
		);

		register_rest_route(
			$namespace,
			'/template/update',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);

		register_rest_route(
			$namespace,
			'/template/edit',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'edit' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);

		register_rest_route(
			$namespace,
			'/template/directory-tree',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'open_directory_tree' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);

		register_rest_route(
			$namespace,
			'/template/initial',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'initial' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);

		register_rest_route(
			$namespace,
			'/template/delete',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'delete' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);

		register_rest_route(
			$namespace,
			'/template/multi-delete',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'multi_delete' ),
				'permission_callback' => array( $this, 'njt_fastdup_permissions_check' ),
			)
		);
	}

	/**
	 * INITIAL TEMPLATE
	 */
	public function initial( $request ) {
		$directory_scan = rtrim( NJT_FASTDUP_WEB_ROOTPATH, '/' );
		$scanner        = new DirectoryHelper();
		$file_dirs      = PackageHelper::directoryToArray( $directory_scan, false, '', $scanner, apply_filters( 'fastdup_get_size_initial', false ) );

		// Tables
		$tables      = Database::get_tables();
		$list_tables = array();
		for ( $i = 0; $i < count( $tables ); $i++ ) {
			array_push( $list_tables, $tables[ $i ][0] );
		}

		$response_object = array(
			'archive' => array(
				'database'  => array( 'tables' => $list_tables ),
				'file_dirs' => $file_dirs,
			),
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function list_template() {
		$templates       = Template::get_list_template();
		$response_object = array(
			'status'               => $templates ? true : false,
			'templates'            => $templates,
			'fastdup_archive_name' => NJT_FASTDUP_ARCHIVE_NAME,
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function add( $request ) {
		$template  = $request->get_json_params();
		$result    = Template::create_template( $template );
		$templates = Template::get_list_template();

		$response_object = array(
			'status'    => $result,
			'templates' => $templates,
			'message'   => $result ? __( 'Created Successfully!', 'fastdup' ) : __( 'Created Unsuccessfully!', 'fastdup' ),
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function edit( $request ) {
		$payload        = stripslashes_deep( $request );
		$id             = $payload['id'];
		$template       = Template::get_template( $id );
		$template['id'] = $id;

		$response_object = array(
			'status'   => $template ? true : false,
			'template' => $template,
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function update( $request ) {
		$payload     = $request->get_json_params();
		$template_id = $payload['id'];
		$result      = Template::update_template( $template_id, $payload );
		$templates   = Template::get_list_template();

		$response_object = array(
			'status'    => $result ? true : false,
			'templates' => $templates,
			'message'   => $result ? __( 'Updated Successfully!', 'fastdup' ) : __( 'Update Unsuccessfully!', 'fastdup' ),
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function delete( $request ) {
		$template_id = $request->get_json_params()['id'];

		$result    = Template::delete_template( $template_id );
		$templates = Template::get_list_template();

		$response_object = array(
			'status'    => $result ? true : false,
			'templates' => $templates,
			'message'   => $result ? __( 'Deleted Successfully!', 'fastdup' ) : __( 'Delete Unsuccessfully!', 'fastdup' ),
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function multi_delete( $request ) {
		$ids       = $request->get_json_params()['ids'];
		$result    = Template::delete_selected_template( $ids );
		$templates = Template::get_list_template();

		$response_object = array(
			'status'    => $result ? true : false,
			'templates' => $templates,
			'message'   => $result ? __( 'Delete Selected Successfully!', 'fastdup' ) : __( 'Delete Selected Unsuccessfully!', 'fastdup' ),
		);
		return new \WP_REST_Response( $response_object, 200 );
	}

	public function open_directory_tree( $request ) {
		$request = stripslashes_deep( $request );

		// Validate required parameters
		if ( ! isset( $request['dir_path'] ) ) {
			return new \WP_Error( 'missing_parameter', 'dir_path parameter is required', array( 'status' => 400 ) );
		}

		$dir_path = $request['dir_path'];
		$dir_key  = $request['dir_key'];

		// Normalize and validate path
		$dir_path = str_replace( '\\', '/', $dir_path );
		$dir_path = trim( $dir_path, '/' );

		// Prevent path traversal attempts
		if ( strpos( $dir_path, '..' ) !== false || strpos( $dir_path, './' ) !== false ) {
			return new \WP_Error( 'invalid_path', 'Invalid directory path: path traversal detected', array( 'status' => 400 ) );
		}

		// Build full path
		$base_path = rtrim( NJT_FASTDUP_WEB_ROOTPATH, '/' );
		$full_path = $base_path . '/' . $dir_path;

		// Resolve real path to prevent symlink attacks
		$resolved_path = realpath( $full_path );
		$resolved_base = realpath( $base_path );

		// Ensure the resolved path is within the allowed base directory
		if ( $resolved_path === false || $resolved_base === false ) {
			return new \WP_Error( 'invalid_path', 'Invalid directory path: path does not exist', array( 'status' => 400 ) );
		}

		// Check if path is within base directory (prevent directory traversal)
		if ( strpos( $resolved_path, $resolved_base ) !== 0 ) {
			return new \WP_Error( 'invalid_path', 'Invalid directory path: access denied', array( 'status' => 403 ) );
		}

		// Ensure it's a directory
		if ( ! is_dir( $resolved_path ) ) {
			return new \WP_Error( 'invalid_path', 'Invalid directory path: not a directory', array( 'status' => 400 ) );
		}

		$directory_scan = $resolved_path;

		$scanner   = new DirectoryHelper();
		$file_dirs = PackageHelper::directoryToArray( $directory_scan, false, '', $scanner, true );
		foreach ( $file_dirs as $key => $item ) {
			$child_dirs[] = array(
				'key'            => $dir_key . '-' . $key,
				'title'          => $item['title'],
				'full_path'      => $item['full_path'],
				'size_formatted' => $item['size_formatted'],
				'type'           => $item['type'],
				'scopedSlots'    => $item['scopedSlots'],
				'children'       => array(),
				'isLeaf'         => $item['isLeaf'],
			);
		}

		$response_object = array(
			'child_dirs' => $child_dirs,
		);
		return new \WP_REST_Response( $response_object, 200 );
	}
	/**
	 * Check if a given request has permission
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_Error|bool
	 */
	public function njt_fastdup_permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}
}
