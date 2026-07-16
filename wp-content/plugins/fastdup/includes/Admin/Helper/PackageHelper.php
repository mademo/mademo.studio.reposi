<?php

namespace NJT\FastDup\Admin\Helper;

use NJT\FastDup\Admin\Database\Database;

defined( 'ABSPATH' ) || exit;
class PackageHelper {


	public static function write_file_scan( $file_name, $data ) {
		$fp = fopen( NJT_FASTDUP_ARCHIVE_DIR_PATH_TMP . "/{$file_name}", 'w' );
		fwrite( $fp, $data );
		fclose( $fp );
	}

	public static function update_option_package_active( $package_id, $step, $is_build, $time_process ) {
		wp_cache_flush();
		$package = Database::get_package_id( $package_id );
		update_option(
			NJT_FASTDUP_PACKAGE_ACTIVE,
			array(
				'package_id'      => $package_id,
				'build_step'      => $step,
				'is_build'        => $is_build,
				'time_process'    => $time_process,
				'process_percent' => $package ? (int) $package->status : -1,
			)
		);
	}

	public static function unschedule_build( $package_id ) {
		$timestamp = wp_next_scheduled( 'njt-fastdup-event', array( $package_id ) );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'njt-fastdup-event', array( $package_id ) );
		}
		wp_clear_scheduled_hook( 'njt-fastdup-event', array( $package_id ) );
	}

	public static function delete_package_local_storage( $name_hash ) {
		// Clean file local
		$local_file_path = NJT_FASTDUP_ARCHIVE_DIR_PATH_PACKAGES;
		self::delete_file_local( $name_hash, $local_file_path );
		// Clean file local temp
		$local_file_path_tmp = NJT_FASTDUP_ARCHIVE_DIR_PATH_TMP;
		self::delete_file_local( $name_hash, $local_file_path_tmp );
		// Clean log
		$local_log_path = NJT_FASTDUP_PATH_LOG;
		self::delete_file_local( $name_hash, $local_log_path );
	}

	public static function delete_file_local( $name_hash, $local_path ) {
		if ( is_dir( $local_path ) ) {
			$files = self::list_files( $local_path );
			foreach ( $files as $file ) {
				$name = basename( $file );
				if ( strstr( $name, $name_hash ) ) {
					@unlink( $file );
				}
			}
		}
	}

	/**
	 * List all of the files of a path
	 *
	 * @param string $path The full path to a system directory
	 * @return array of all files in that path
	 */
	public static function list_files( $path = '.' ) {
		try {
			$files = array();
			foreach ( new \DirectoryIterator( $path ) as $file ) {
				$files[] = Helper::safe_path( $file->getPathname() );
			}
			return $files;
		} catch ( \Exception $exc ) {
			$result = array();
			$files  = @scandir( $path );
			if ( is_array( $files ) ) {
				foreach ( $files as $file ) {
					$result[] = Helper::safe_path( $path . DIRECTORY_SEPARATOR . $file );
				}
			}
			return $result;
		}
	}

	public static function hasUTF8( $string ) {
		return preg_match(
			'%(?:
            [\xC2-\xDF][\x80-\xBF]        # non-overlong 2-byte
            |\xE0[\xA0-\xBF][\x80-\xBF]               # excluding overlongs
            |[\xE1-\xEC\xEE\xEF][\x80-\xBF]{2}      # straight 3-byte
            |\xED[\x80-\x9F][\x80-\xBF]               # excluding surrogates
            |\xF0[\x90-\xBF][\x80-\xBF]{2}    # planes 1-3
            |[\xF1-\xF3][\x80-\xBF]{3}                  # planes 4-15
            |\xF4[\x80-\x8F][\x80-\xBF]{2}    # plane 16
            )+%xs',
			$string
		);
	}

	/**
	 * Get an array that represents directory tree
	 *
	 * @param string $directory     Directory path
	 * @param bool   $recursive         Include sub directories
	 * @param regex  $exclude         Exclude paths that matches this regex
	 */
	public static function directoryToArray( $directory, $recursive = true, $exclude = '', $scanner = null, $get_size = false ) {
		$arrayItems    = array();
		$skipByExclude = false;
		$handle        = opendir( $directory );

		$dirs  = array();
		$files = array();
		if ( $scanner === null && $get_size ) {
			$scanner = new DirectoryHelper();
		}
		if ( $handle ) {
			$key = 0;
			while ( false !== ( $file = readdir( $handle ) ) ) {
				preg_match( $GLOBALS['NJT_FASTDUP_GLOBAL_PREG'], $file, $skip );
				if ( $exclude ) {
					preg_match( $exclude, $file, $skipByExclude );
				}

				if ( ! $skip && ! $skipByExclude ) {
					++$key;
					if ( is_dir( $directory . DIRECTORY_SEPARATOR . $file ) ) {
						if ( $recursive ) {
							$arrayItems = array_merge( $arrayItems, self::directoryToArray( $directory . DIRECTORY_SEPARATOR . $file, $recursive, $exclude, $scanner, $get_size ) );
						}

						$full_path = $directory . DIRECTORY_SEPARATOR . $file;
						$full_path = Helper::safe_path( $full_path );

						$original_path = $full_path;

						$full_path = str_replace( NJT_FASTDUP_WEB_ROOTPATH, '', $full_path );

						$dirs[] = array(
							'key'            => $key,
							'title'          => $file,
							'full_path'      => $full_path,
							'size_formatted' => $get_size ? self::getFolderSize( $original_path, false, true, $scanner ) : 0,
							'type'           => 'dir',
							'scopedSlots'    => array( 'icon' => 'custom' ),
							'children'       => array(),
							'isLeaf'         => false,
						);
					} else {
						$full_path = $directory . DIRECTORY_SEPARATOR . $file;
						$full_path = Helper::safe_path( $full_path );
						$full_path = str_replace( NJT_FASTDUP_WEB_ROOTPATH, '', $full_path );

						$files[] = array(
							'key'            => $key,
							'title'          => $file,
							'full_path'      => $full_path,
							'size_formatted' => $get_size ? self::format_size( filesize( $full_path ) ) : 0,
							'type'           => 'file',
							'scopedSlots'    => array( 'icon' => 'file' ),
							'isLeaf'         => true,
						);
					}
				}
			}

			// Sort
			$dirs_title_sort = array_column( $dirs, 'title' );
			array_multisort( $dirs_title_sort, SORT_NATURAL, $dirs );

			$files_title_sort = array_column( $files, 'title' );
			array_multisort( $files_title_sort, SORT_NATURAL, $files );

			$arrayItems = array_merge( $dirs, $files );

			closedir( $handle );
		}

		return $arrayItems;
	}

	public static function format_file_dirs( $filter_file_dirs ) {
		$result = array(
			'filter_files' => array(),
			'filter_dirs'  => array(),
		);

		foreach ( $filter_file_dirs as $key => $value ) {
			$file_path = Helper::safe_path( NJT_FASTDUP_WEB_ROOTPATH . trim( $value ) );
			if ( is_dir( $file_path ) ) {
				$result['filter_dirs'][] = $file_path;
			} else {
				$result['filter_files'][] = $file_path;
			}
		}
		return $result;
	}

	public static function format_size( $bytes ) {
		$units = array( 'B', 'KB', 'MB', 'GB', 'TB' );
		$bytes = max( $bytes, 0 );
		$pow   = floor( ( $bytes ? log( $bytes ) : 0 ) / log( 1024 ) );
		$pow   = min( $pow, count( $units ) - 1 );

		$bytes /= pow( 1024, $pow );

		return round( $bytes, 2 ) . ' ' . $units[ $pow ];
	}

	public static function getFolderSize( $path, $followSymlinks = false, $includeHidden = true, $scanner = null ) {

		try {
			// Use provided scanner or create new one
			if ( $scanner === null ) {
				$scanner = new DirectoryHelper();
			}

			// Configure exclusions based on includeHidden option
			if ( $includeHidden ) {
				// Include everything
				$scanner->setExcludeDirs( array() );
				$scanner->setExcludeFiles( array() );
			} else {
				// Exclude hidden directories and files
				$hiddenDirs  = array( '.git', '.svn', '.idea', '.vscode' );
				$hiddenFiles = array( '.DS_Store', '.gitignore', '.htaccess', 'Thumbs.db', 'desktop.ini' );

				$scanner->setExcludeDirs( $hiddenDirs );
				$scanner->setExcludeFiles( $hiddenFiles );
			}

			$scanner->setExcludeExts( array() );
			$scanner->setFollowSymlinks( $followSymlinks );

			$result = $scanner->quickScan( $path );
			return $result['total_size_formatted'];

		} catch ( \Exception $e ) {
			return 'Error';
		}
	}
}
