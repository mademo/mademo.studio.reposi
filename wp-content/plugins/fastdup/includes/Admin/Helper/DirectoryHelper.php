<?php
namespace NJT\FastDup\Admin\Helper;

defined( 'ABSPATH' ) || exit;
class DirectoryHelper {

	/** @var array List of directories to exclude */
	private $excludeDirs = array();

	/** @var array List of file extensions to exclude */
	private $excludeExts = array();

	/** @var array List of file names to exclude */
	private $excludeFiles = array();

	/** @var array List of symbolic links found */
	private $symbolicLinks = array();

	/** @var array List of unreadable files/folders */
	private $unreadableItems = array();

	/** @var int Total number of files */
	private $totalFiles = 0;

	/** @var int Total number of directories */
	private $totalDirs = 0;

	/** @var int Total size in bytes */
	private $totalSize = 0;

	/** @var bool Whether to follow symbolic links */
	private $followSymlinks = false;

	/** @var int Maximum depth limit (-1 = no limit) */
	private $maxDepth = -1;

	/** @var int Current depth */
	private $currentDepth = 0;

	/** @var bool Whether to use cache */
	private $useCache = false;

	/** @var int Cache expiry time in minutes */
	private $cacheExpiry = 30;

	/**
	 * Constructor
	 */
	public function __construct() {
		// Set default filters
		$this->excludeDirs = array(
			'.git',
			'.svn',
			'node_modules',
			'.idea',
			'.vscode',
			'vendor',
			'cache',
			'tmp',
			'temp',
		);

		$this->excludeExts = array(
			'log',
			'tmp',
			'temp',
			'cache',
		);

		$this->excludeFiles = array(
			'.DS_Store',
			'Thumbs.db',
			'desktop.ini',
			'error_log',
			'debug.log',
		);
	}

	/**
	 * Set list of directories to exclude
	 *
	 * @param array $dirs
	 * @return self
	 */
	public function setExcludeDirs( array $dirs ) {
		$this->excludeDirs = $dirs;
		return $this;
	}

	/**
	 * Add directory to exclude list
	 *
	 * @param string $dir
	 * @return self
	 */
	public function addExcludeDir( $dir ) {
		$this->excludeDirs[] = $dir;
		return $this;
	}

	/**
	 * Set list of file extensions to exclude
	 *
	 * @param array $exts
	 * @return self
	 */
	public function setExcludeExts( array $exts ) {
		$this->excludeExts = $exts;
		return $this;
	}

	/**
	 * Set list of files to exclude
	 *
	 * @param array $files
	 * @return self
	 */
	public function setExcludeFiles( array $files ) {
		$this->excludeFiles = $files;
		return $this;
	}

	/**
	 * Set whether to follow symbolic links
	 *
	 * @param bool $follow
	 * @return self
	 */
	public function setFollowSymlinks( $follow = true ) {
		$this->followSymlinks = $follow;
		return $this;
	}

	/**
	 * Set maximum depth limit
	 *
	 * @param int $depth -1 = no limit
	 * @return self
	 */
	public function setMaxDepth( $depth = -1 ) {
		$this->maxDepth = $depth;
		return $this;
	}

	/**
	 * Set cache usage
	 *
	 * @param bool $useCache
	 * @param int  $cacheExpiry Cache expiry in minutes
	 * @return self
	 */
	public function setCache( $useCache = true, $cacheExpiry = 30 ) {
		$this->useCache    = $useCache;
		$this->cacheExpiry = $cacheExpiry;
		return $this;
	}

	/**
	 * Scan directory and return information
	 *
	 * @param string $path Path to scan
	 * @return array
	 */
	public function scan( $path ) {
		// Reset counters
		$this->totalFiles      = 0;
		$this->totalDirs       = 0;
		$this->totalSize       = 0;
		$this->symbolicLinks   = array();
		$this->unreadableItems = array();
		$this->currentDepth    = 0;

		if ( ! is_dir( $path ) ) {
			throw new \InvalidArgumentException( "Path is not a directory: $path" );
		}

		if ( ! is_readable( $path ) ) {
			throw new \InvalidArgumentException( "Path is not readable: $path" );
		}

		$startTime = microtime( true );
		$result    = $this->scanDirectory( $path );
		$endTime   = microtime( true );

		return array(
			'path'                 => $path,
			'total_files'          => $this->totalFiles,
			'total_dirs'           => $this->totalDirs,
			'total_size'           => $this->totalSize,
			'total_size_formatted' => $this->formatBytes( $this->totalSize ),
			'total_items'          => $this->totalFiles + $this->totalDirs,
			'scan_time'            => round( $endTime - $startTime, 4 ),
			'symbolic_links'       => $this->symbolicLinks,
			'unreadable_items'     => $this->unreadableItems,
			'directory_tree'       => $result,
		);
	}

	/**
	 * Scan directory recursively (core method)
	 *
	 * @param string $path
	 * @return array|false
	 */
	private function scanDirectory( $path ) {
		// Check depth limit
		if ( $this->maxDepth >= 0 && $this->currentDepth > $this->maxDepth ) {
			return false;
		}

		// Open directory
		if ( ( $handle = opendir( $path ) ) === false ) {
			$this->unreadableItems[] = $path;
			return false;
		}

		$result = array(
			'path'     => $path,
			'size'     => 0,
			'files'    => 0,
			'dirs'     => 0,
			'children' => array(),
		);

		// Read each item in directory
		while ( ( $itemName = readdir( $handle ) ) !== false ) {
			if ( $itemName === '.' || $itemName === '..' ) {
				continue;
			}

			$itemPath = $path . DIRECTORY_SEPARATOR . $itemName;

			if ( is_dir( $itemPath ) ) {
				$this->handleDirectory( $itemPath, $itemName, $result );
			} else {
				$this->handleFile( $itemPath, $itemName, $result );
			}
		}

		closedir( $handle );

		// Update total directory count
		++$this->totalDirs;

		return $result;
	}

	/**
	 * Handle directory processing
	 *
	 * @param string $itemPath
	 * @param string $itemName
	 * @param array  &$result
	 */
	private function handleDirectory( $itemPath, $itemName, &$result ) {
		// Check symbolic link
		if ( is_link( $itemPath ) ) {
			$this->symbolicLinks[] = $itemPath;

			if ( ! $this->followSymlinks ) {
				return;
			}

			// Check if symbolic link creates infinite loop
			$realPath = realpath( $itemPath );
			if ( $realPath && strpos( $itemPath, $realPath ) === 0 ) {
				return; // Skip to avoid infinite loop
			}
		}

		// Check if directory should be excluded
		if ( in_array( $itemName, $this->excludeDirs ) ) {
			return;
		}

		// Check if readable
		if ( ! is_readable( $itemPath ) ) {
			$this->unreadableItems[] = $itemPath;
			return;
		}

		// Scan subdirectory
		++$this->currentDepth;
		$childResult = $this->scanDirectory( $itemPath );
		--$this->currentDepth;

		if ( $childResult !== false ) {
			$result['size']      += $childResult['size'];
			$result['files']     += $childResult['files'];
			$result['dirs']      += $childResult['dirs'];
			$result['children'][] = $childResult;
		}
	}

	/**
	 * Handle file processing
	 *
	 * @param string $itemPath
	 * @param string $itemName
	 * @param array  &$result
	 */
	private function handleFile( $itemPath, $itemName, &$result ) {
		// Check symbolic link
		if ( is_link( $itemPath ) ) {
			$this->symbolicLinks[] = $itemPath;
			if ( ! $this->followSymlinks ) {
				return;
			}
		}

		// Check file extension
		$extension = strtolower( pathinfo( $itemName, PATHINFO_EXTENSION ) );
		if ( in_array( $extension, $this->excludeExts ) ) {
			return;
		}

		// Check file name
		if ( in_array( $itemName, $this->excludeFiles ) ) {
			return;
		}

		// Check if readable
		if ( ! is_readable( $itemPath ) ) {
			$this->unreadableItems[] = $itemPath;
			return;
		}

		// Get file size
		$fileSize = filesize( $itemPath );
		if ( $fileSize === false ) {
			$fileSize = 0;
		}

		// Update counters
		$result['size'] += $fileSize;
		++$result['files'];
		++$this->totalFiles;
		$this->totalSize += $fileSize;
	}

	/**
	 * Format bytes to human readable format
	 *
	 * @param int $bytes
	 * @return string
	 */
	private function formatBytes( $bytes ) {
		$units = array( 'B', 'KB', 'MB', 'GB', 'TB' );
		$bytes = max( $bytes, 0 );
		$pow   = floor( ( $bytes ? log( $bytes ) : 0 ) / log( 1024 ) );
		$pow   = min( $pow, count( $units ) - 1 );

		$bytes /= pow( 1024, $pow );

		return round( $bytes, 2 ) . ' ' . $units[ $pow ];
	}

	/**
	 * Quick scan for overview information only (no directory tree)
	 *
	 * @param string $path
	 * @return array
	 */
	public function quickScan( $path ) {
		// Reset counters
		$this->totalFiles      = 0;
		$this->totalDirs       = 0;
		$this->totalSize       = 0;
		$this->symbolicLinks   = array();
		$this->unreadableItems = array();
		$this->currentDepth    = 0;

		if ( ! is_dir( $path ) ) {
			throw new \InvalidArgumentException( "Path is not a directory: $path" );
		}

		$startTime = microtime( true );
		$this->quickScanDirectory( $path );
		$endTime = microtime( true );

		return array(
			// 'path' => $path,
			// 'total_files' => $this->totalFiles,
			// 'total_dirs' => $this->totalDirs,
			'total_size'           => $this->totalSize,
			'total_size_formatted' => $this->formatBytes( $this->totalSize ),
			// 'total_items' => $this->totalFiles + $this->totalDirs,
			// 'scan_time' => round($endTime - $startTime, 4),
			// 'symbolic_links_count' => count($this->symbolicLinks),
			// 'unreadable_items_count' => count($this->unreadableItems)
		);
	}

	/**
	 * Quick scan directory (count only, no tree structure)
	 *
	 * @param string $path
	 * @return void
	 */
	private function quickScanDirectory( $path ) {
		// Check depth limit
		if ( $this->maxDepth >= 0 && $this->currentDepth > $this->maxDepth ) {
			return;
		}

		// Check cache first
		if ( $this->useCache ) {
			$cached = $this->getCachedDirectorySize( $path );
			if ( $cached !== false ) {
				$this->totalSize  += $cached['size'];
				$this->totalFiles += $cached['files'];
				$this->totalDirs  += $cached['dirs'];
				return;
			}
		}

		if ( ( $handle = opendir( $path ) ) === false ) {
			$this->unreadableItems[] = $path;
			return;
		}

		// Track values before scanning this directory
		$sizeBefore  = $this->totalSize;
		$filesBefore = $this->totalFiles;
		$dirsBefore  = $this->totalDirs;

		++$this->totalDirs;

		while ( ( $itemName = readdir( $handle ) ) !== false ) {
			if ( $itemName === '.' || $itemName === '..' ) {
				continue;
			}

			$itemPath = $path . DIRECTORY_SEPARATOR . $itemName;

			if ( is_dir( $itemPath ) ) {
				// Handle directory
				if ( is_link( $itemPath ) ) {
					$this->symbolicLinks[] = $itemPath;
					if ( ! $this->followSymlinks ) {
						continue;
					}
				}

				if ( in_array( $itemName, $this->excludeDirs ) ) {
					continue;
				}

				if ( ! is_readable( $itemPath ) ) {
					$this->unreadableItems[] = $itemPath;
					continue;
				}

				++$this->currentDepth;
				$this->quickScanDirectory( $itemPath );
				--$this->currentDepth;

			} else {
				// Handle file
				if ( is_link( $itemPath ) ) {
					$this->symbolicLinks[] = $itemPath;
					if ( ! $this->followSymlinks ) {
						continue;
					}
				}

				$extension = strtolower( pathinfo( $itemName, PATHINFO_EXTENSION ) );
				if ( in_array( $extension, $this->excludeExts ) ) {
					continue;
				}

				if ( in_array( $itemName, $this->excludeFiles ) ) {
					continue;
				}

				if ( ! is_readable( $itemPath ) ) {
					$this->unreadableItems[] = $itemPath;
					continue;
				}

				$fileSize = filesize( $itemPath );
				if ( $fileSize === false ) {
					$fileSize = 0;
				}

				++$this->totalFiles;
				$this->totalSize += $fileSize;
			}
		}

		closedir( $handle );

		// Cache the results for this directory
		if ( $this->useCache ) {
			$sizeAfter  = $this->totalSize;
			$filesAfter = $this->totalFiles;
			$dirsAfter  = $this->totalDirs;

			$this->setCachedDirectorySize(
				$path,
				array(
					'size' => $sizeAfter - $sizeBefore,
				// 'files' => $filesAfter - $filesBefore,
				// 'dirs' => $dirsAfter - $dirsBefore,
				// 'timestamp' => time()
				)
			);
		}
	}

	/**
	 * Get list of files in directory (non-recursive)
	 *
	 * @param string $path
	 * @param bool   $includeHidden
	 * @return array
	 */
	public function listFiles( $path, $includeHidden = false ) {
		if ( ! is_dir( $path ) || ! is_readable( $path ) ) {
			return array();
		}

		$files = array();
		if ( ( $handle = opendir( $path ) ) !== false ) {
			while ( ( $itemName = readdir( $handle ) ) !== false ) {
				if ( $itemName === '.' || $itemName === '..' ) {
					continue;
				}

				if ( ! $includeHidden && $itemName[0] === '.' ) {
					continue;
				}

				$itemPath = $path . DIRECTORY_SEPARATOR . $itemName;
				if ( is_file( $itemPath ) ) {
					$files[] = array(
						'name'     => $itemName,
						'path'     => $itemPath,
						'size'     => filesize( $itemPath ) ?: 0,
						'modified' => filemtime( $itemPath ) ?: 0,
						'is_link'  => is_link( $itemPath ),
					);
				}
			}
			closedir( $handle );
		}

		return $files;
	}

	/**
	 * Get list of subdirectories (non-recursive)
	 *
	 * @param string $path
	 * @param bool   $includeHidden
	 * @return array
	 */
	public function listDirs( $path, $includeHidden = false ) {
		if ( ! is_dir( $path ) || ! is_readable( $path ) ) {
			return array();
		}

		$dirs = array();
		if ( ( $handle = opendir( $path ) ) !== false ) {
			while ( ( $itemName = readdir( $handle ) ) !== false ) {
				if ( $itemName === '.' || $itemName === '..' ) {
					continue;
				}

				if ( ! $includeHidden && $itemName[0] === '.' ) {
					continue;
				}

				$itemPath = $path . DIRECTORY_SEPARATOR . $itemName;
				if ( is_dir( $itemPath ) ) {
					$dirs[] = array(
						'name'     => $itemName,
						'path'     => $itemPath,
						'modified' => filemtime( $itemPath ) ?: 0,
						'is_link'  => is_link( $itemPath ),
					);
				}
			}
			closedir( $handle );
		}

		return $dirs;
	}

	/**
	 * Get cache file path
	 *
	 * @return string
	 */
	private function getCacheFilePath() {
		$upload_dir = wp_upload_dir();
		$cache_dir  = $upload_dir['basedir'] . '/fastdup-cache';

		if ( ! is_dir( $cache_dir ) ) {
			wp_mkdir_p( $cache_dir );
		}

		return $cache_dir . '/directory_sizes.json';
	}

	/**
	 * Get cached directory size
	 *
	 * @param string $path
	 * @return array|false
	 */
	private function getCachedDirectorySize( $path ) {
		$cacheFile = $this->getCacheFilePath();
		if ( ! file_exists( $cacheFile ) ) {
			return false;
		}

		$cacheData = json_decode( file_get_contents( $cacheFile ), true );
		if ( ! $cacheData || ! is_array( $cacheData ) ) {
			return false;
		}

		// $cacheKey = md5($path);
		$cacheKey = $path;
		if ( ! isset( $cacheData[ $cacheKey ] ) ) {
			return false;
		}

		$cached      = $cacheData[ $cacheKey ];
		$currentTime = time();

		// Check if cache is expired
		if ( ( $currentTime - $cached['timestamp'] ) > ( $this->cacheExpiry * 60 ) ) {
			return false;
		}

		return $cached;
	}

	/**
	 * Set cached directory size
	 *
	 * @param string $path
	 * @param array  $data
	 */
	private function setCachedDirectorySize( $path, $data ) {
		$cacheFile = $this->getCacheFilePath();

		// Load existing cache
		$cacheData = array();
		if ( file_exists( $cacheFile ) ) {
			$existingData = json_decode( file_get_contents( $cacheFile ), true );
			if ( $existingData && is_array( $existingData ) ) {
				$cacheData = $existingData;
			}
		}

		// Add new cache entry
		// $cacheKey = md5($path);
		$cacheKey               = $path;
		$cacheData[ $cacheKey ] = $data;

		// Save cache file
		try {
			file_put_contents( $cacheFile, json_encode( $cacheData, JSON_PRETTY_PRINT ) );
		} catch ( \Exception $e ) {
			// Silently fail if can't write cache
		}
	}

	/**
	 * Clear cache for specific path or all cache
	 *
	 * @param string|null $path
	 */
	public function clearCache( $path = null ) {
		$cacheFile = $this->getCacheFilePath();

		if ( $path === null ) {
			// Clear all cache
			if ( file_exists( $cacheFile ) ) {
				unlink( $cacheFile );
			}
		} else {
			// Clear specific path
			if ( file_exists( $cacheFile ) ) {
				$cacheData = json_decode( file_get_contents( $cacheFile ), true );
				if ( $cacheData && is_array( $cacheData ) ) {
					// $cacheKey = md5($path);
					$cacheKey = $path;
					if ( isset( $cacheData[ $cacheKey ] ) ) {
						unset( $cacheData[ $cacheKey ] );
						file_put_contents( $cacheFile, json_encode( $cacheData, JSON_PRETTY_PRINT ) );
					}
				}
			}
		}
	}
}
