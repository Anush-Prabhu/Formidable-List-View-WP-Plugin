<?php
/**
 * REST API for List View tree refresh.
 *
 * @package FormidableListView
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( 'You are not allowed to call this page directly.' );
}

/**
 * REST routes for formidable-list-view.
 */
class FLV_REST {

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			'frm-list-view/v1',
			'/form/(?P<id>\d+)/tree',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_tree' ),
				'permission_callback' => array( __CLASS__, 'can_edit_form' ),
				'args'                => array(
					'id' => array(
						'validate_callback' => function ( $param ) {
							return is_numeric( $param ) && $param > 0;
						},
					),
				),
			)
		);
	}

	/**
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_tree( $request ) {
		$form_id = absint( $request['id'] );
		$tree    = FLV_Tree_Builder::build( $form_id );

		return rest_ensure_response(
			array(
				'formId' => $form_id,
				'tree'   => $tree,
			)
		);
	}

	/**
	 * @param WP_REST_Request $request Request.
	 * @return bool
	 */
	public static function can_edit_form( $request ) {
		if ( ! FLV_Plugin::user_can_edit_forms() ) {
			return false;
		}

		$form_id = absint( $request['id'] );
		if ( ! $form_id || ! class_exists( 'FrmForm' ) ) {
			return false;
		}

		$form = FrmForm::getOne( $form_id );
		return ! empty( $form );
	}
}
