<?php

namespace NJT\FastDup\Admin\Helper;

class ServerHelper {
	/**
	 * Scan system
	 */
	public static function system_scan() {
		global $wp_version;

		$web_server_value = strtolower( explode( '/', $_SERVER['SERVER_SOFTWARE'] )[0] );
		$web_server       = array(
			'name'        => __( 'Web Server', 'fastdup' ),
			'value'       => explode( '/', $_SERVER['SERVER_SOFTWARE'] )[0],
			'view_detail' => '',
			'note'        => __( 'Supported web servers: Nginx, Apache, LiteSpeed, Lighttpd, IIS, uWSGI ,WebServerX', 'fastdup' ),
			'status'      => in_array( $web_server_value, array( 'apache', 'litespeed', 'nginx', 'lighttpd', 'iis', 'microsoft-iis', 'webserverx', 'uwsgi' ) ),
		);

		$open_basedir = array(
			'name'        => __( 'PHP Open BaseDir', 'fastdup' ),
			'value'       => ini_get( 'open_basedir' ),
			'status'      => ini_get( 'open_basedir' ) == '' ? true : false,
			'view_detail' => '',
			'note'        => __( 'If this [open_basedir] is enabled, it can cause some errors. In that case, please ask your host to disable it in the php.ini file.', 'fastdup' ),
		);

		$php_version = array(
			'name'        => __( 'PHP Version', 'fastdup' ),
			'value'       => phpversion(),
			'view_detail' => '',
			'note'        => __( 'FastDup supports PHP version 5.3.0 or higher.', 'fastdup' ),
			'status'      => self::php_version_compare(),
		);

		$max_exc_value      = ini_get( 'max_execution_time' );
		$max_execution_time = array(
			'name'        => __( 'PHP Max Execution Time', 'fastdup' ),
			'value'       => $max_exc_value,
			'status'      => $max_exc_value == 0 ? true : false,
			'view_detail' => 'https://www.php.net/manual/en/info.configuration.php#ini.max-execution-time',
			'note'        => __( 'If the [max_execution_time] value in the php.ini is too low, errors may occur. It is recommended to set timeout to value of 0.', 'fastdup' ),
		);

		$is_support_zip = class_exists( 'ZipArchive' );
		$zip_archive    = array(
			'name'        => 'PHP ZipArchive',
			'value'       => $is_support_zip ? __( 'enabled', 'fastdup' ) : __( 'unenabled', 'fastdup' ),
			'status'      => $is_support_zip,
			'view_detail' => '',
			'note'        => __( 'If ziparchive is not enabled, your source might be not zipped successfully.', 'fastdup' ),
		);

		$is_support_wp      = self::wp_version_compare( $wp_version );
		$wp_version_compare = array(
			'name'        => __( 'Wordpress Version', 'fastdup' ),
			'value'       => $wp_version,
			'status'      => $is_support_wp,
			'view_detail' => '',
			'note'        => __( 'It is recommended to update your site to the latest version of WordPress. Old versions can cause errors or put your site at risk.', 'fastdup' ),
		);

		$permission_folder = array(
			'name'        => __( 'Folder', 'fastdup' ),
			'value'       => NJT_FASTDUP_ARCHIVE_DIR_PATH,
			'status'      => is_writeable( NJT_FASTDUP_ARCHIVE_DIR_PATH ),
			'view_detail' => '',
			'note'        => __( 'This folder needs write permission.', 'fastdup' ),
		);

		if ( function_exists( 'disk_free_space' ) ) {
			$disk_space_free_val = disk_free_space( NJT_FASTDUP_WEB_ROOTPATH );
			$disk_space_free     = array(
				'name'        => __( 'Disk Space Available', 'fastdup' ),
				'value'       => Helper::format_bytes( disk_free_space( NJT_FASTDUP_WEB_ROOTPATH ) ),
				'status'      => $disk_space_free_val > 100000000 ? true : false, // > 100MB true
				'view_detail' => '',
				'note'        => __( 'Less than 100MB, please make sure your disk space is enough.', 'fastdup' ),
			);
		} else {
			$disk_space_free = array(
				'name'        => __( 'Disk Space Available', 'fastdup' ),
				'value'       => __( 'Unknown', 'fastdup' ),
				'status'      => false,
				'view_detail' => '',
				'note'        => __( 'Don\'t have permission to check disk space.', 'fastdup' ),
			);
		}

		$general_require = array( $web_server, $open_basedir, $php_version, $max_execution_time, $zip_archive, $permission_folder, $disk_space_free );
		if ( ! $is_support_wp ) {
			array_push( $general_require, $wp_version_compare );
		}
		$general_require_status = array_filter(
			$general_require,
			function ( $item ) {
				return $item['status'];
			}
		);

		return array(
			'status' => count( $general_require_status ) == count( $general_require ) ? true : false,
			'data'   => $general_require,
		);
	}

	public static function set_limit_excute_script() {
		try {
			@ignore_user_abort( true );
			if ( function_exists( 'set_time_limit' ) ) {
				@set_time_limit( 0 );
			} elseif ( function_exists( 'ini_set' ) ) {
					@ini_set( 'max_execution_time', 0 );
			}
			// session_write_close();
		} catch ( \Exception $ex ) {
			@ignore_user_abort( true );
			if ( function_exists( 'set_time_limit' ) ) {
				@set_time_limit( 3600 ); // 60min
			} elseif ( function_exists( 'ini_set' ) ) {
					@ini_set( 'max_execution_time', 3600 ); // 60min

			}
		}
	}

	public static function wp_version_compare( $wp_version ) {
		return version_compare( $wp_version, '4.6.0', '>=' );
	}

	public static function php_version_compare() {
		return version_compare( PHP_VERSION, '5.3.0', '>=' );
	}
}
