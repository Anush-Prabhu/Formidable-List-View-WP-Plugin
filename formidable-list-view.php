<?php
/**
 * Plugin Name: Formidable List View
 * Description: Adds a hierarchical List View tab to the Formidable form builder for navigation, inline editing, and reordering.
 * Version: 1.0.12
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: formidable-list-view
 *
 * @package FormidableListView
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( 'You are not allowed to call this page directly.' );
}

define( 'FLV_VERSION', '1.0.12' );
define( 'FLV_PLUGIN_FILE', __FILE__ );
define( 'FLV_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'FLV_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once FLV_PLUGIN_PATH . 'includes/class-flv-plugin.php';

add_action( 'plugins_loaded', 'flv_bootstrap' );

/**
 * Bootstrap the plugin after dependencies are available.
 *
 * @return void
 */
function flv_bootstrap() {
	FLV_Plugin::init();
}
