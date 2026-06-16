<?php
/**
 * Main plugin controller.
 *
 * @package FormidableListView
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( 'You are not allowed to call this page directly.' );
}

require_once FLV_PLUGIN_PATH . 'includes/class-flv-tree-builder.php';
require_once FLV_PLUGIN_PATH . 'includes/class-flv-rest.php';

/**
 * Plugin bootstrap and hooks.
 */
class FLV_Plugin {

	/**
	 * @return void
	 */
	public static function init() {
		if ( ! self::dependencies_met() ) {
			add_action( 'admin_notices', array( __CLASS__, 'dependency_notice' ) );
			return;
		}

		FLV_REST::init();

		add_action( 'frm_extra_form_instruction_tabs', array( __CLASS__, 'render_tab_nav' ) );
		add_action( 'frm_extra_form_instruction_tabs_content', array( __CLASS__, 'render_tab_content' ), 10, 1 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * @return bool
	 */
	private static function dependencies_met() {
		if ( ! class_exists( 'FrmAppHelper' ) ) {
			return false;
		}

		return version_compare( FrmAppHelper::plugin_version(), '6.31', '>=' );
	}

	/**
	 * @return void
	 */
	public static function dependency_notice() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		$message = class_exists( 'FrmAppHelper' )
			? esc_html__( 'Formidable List View requires Formidable Forms 6.31 or newer.', 'formidable-list-view' )
			: esc_html__( 'Formidable List View requires Formidable Forms to be installed and active.', 'formidable-list-view' );

		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html( $message )
		);
	}

	/**
	 * @return void
	 */
	public static function render_tab_nav() {
		?>
		<li class="hide-if-no-js">
			<a href="#frm-list-view-panel" id="frm-list-view-tab">
				<?php esc_html_e( 'List View', 'formidable-list-view' ); ?>
			</a>
		</li>
		<?php
	}

	/**
	 * @param object $form Form object.
	 * @return void
	 */
	public static function render_tab_content( $form ) {
		if ( empty( $form->id ) || ! self::user_can_edit_forms() ) {
			return;
		}

		$tree = FLV_Tree_Builder::build( $form->id );

		include FLV_PLUGIN_PATH . 'views/list-view-panel.php';
	}

	/**
	 * @param string $hook Admin page hook.
	 * @return void
	 */
	public static function enqueue_assets( $hook ) {
		if ( ! self::is_builder_screen() || ! self::user_can_edit_forms() ) {
			return;
		}

		$form_id = FrmAppHelper::get_param( 'id', 0, 'get', 'absint' );
		if ( ! $form_id || ! class_exists( 'FrmForm' ) || ! FrmForm::getOne( $form_id ) ) {
			return;
		}

		$deps = array( 'jquery', 'jquery-ui-sortable', 'jquery-ui-draggable', 'formidable_admin', 'formidable-settings-components', 'wp-hooks' );
		if ( FrmAppHelper::pro_is_installed() ) {
			$deps[] = 'formidable_pro_builder';
		}

		wp_enqueue_style(
			'formidable-list-view',
			FLV_PLUGIN_URL . 'assets/css/list-view.css',
			array( 'formidable_admin_global' ),
			FLV_VERSION
		);

		wp_enqueue_script(
			'formidable-list-view',
			FLV_PLUGIN_URL . 'assets/js/list-view.js',
			$deps,
			FLV_VERSION,
			true
		);

		wp_localize_script(
			'formidable-list-view',
			'frmListView',
			array(
				'formId'   => $form_id,
				'restUrl'  => rest_url( 'frm-list-view/v1/form/' . $form_id . '/tree' ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'frm_ajax' ),
				'i18n'     => array(
					'searchPlaceholder'   => __( 'Search fields…', 'formidable-list-view' ),
					'emptyTree'           => __( 'No fields in this form yet.', 'formidable-list-view' ),
					'visible'             => __( 'Visible', 'formidable-list-view' ),
					'fieldSettings'       => __( 'Field Settings', 'formidable-list-view' ),
					'duplicate'           => __( 'Duplicate', 'formidable-list-view' ),
					'delete'              => __( 'Delete', 'formidable-list-view' ),
					'deleteGroup'         => __( 'Delete Group', 'formidable-list-view' ),
					'duplicateGroup'      => __( 'Duplicate Group', 'formidable-list-view' ),
					'moreOptions'         => __( 'More options', 'formidable-list-view' ),
					'confirmDelete'       => __( 'Are you sure you want to delete this field?', 'formidable-list-view' ),
					'label'               => __( 'Label', 'formidable-list-view' ),
					'collapseToPages'     => __( 'Collapse to pages', 'formidable-list-view' ),
					'syncBuilderCollapse' => __( 'Sync collapse with builder', 'formidable-list-view' ),
					'expand'              => __( 'Expand', 'formidable-list-view' ),
					'collapse'            => __( 'Collapse', 'formidable-list-view' ),
					'dragHandle'          => __( 'Drag to reorder', 'formidable-list-view' ),
				),
			)
		);
	}

	/**
	 * @return bool
	 */
	private static function is_builder_screen() {
		if ( ! FrmAppHelper::is_form_builder_page() ) {
			return false;
		}

		return 'edit' === FrmAppHelper::get_param( 'frm_action', '', 'get', 'sanitize_title' );
	}

	/**
	 * Whether the current user may edit Formidable forms.
	 *
	 * @return bool
	 */
	public static function user_can_edit_forms() {
		if ( ! class_exists( 'FrmAppHelper' ) ) {
			return false;
		}

		return ! FrmAppHelper::permission_nonce_error( 'frm_edit_forms' );
	}
}
