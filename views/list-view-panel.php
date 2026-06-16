<?php
/**
 * List View tab panel markup.
 *
 * @package FormidableListView
 *
 * @var object $form Form object.
 * @var array  $tree Field tree nodes.
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( 'You are not allowed to call this page directly.' );
}
?>
<div>
	<div id="frm-list-view-panel" class="tabs-panel flv-panel">
		<div class="flv-toolbar">
			<label class="screen-reader-text" for="flv-search-fields">
				<?php esc_html_e( 'Search fields', 'formidable-list-view' ); ?>
			</label>
			<input
				type="search"
				id="flv-search-fields"
				class="flv-search"
				placeholder="<?php esc_attr_e( 'Search fields…', 'formidable-list-view' ); ?>"
				autocomplete="off"
			/>
			<div class="flv-toolbar-options">
				<label class="flv-toolbar-option">
					<input type="checkbox" id="flv-collapse-pages" value="1" />
					<span><?php esc_html_e( 'Collapse to pages', 'formidable-list-view' ); ?></span>
				</label>
				<label class="flv-toolbar-option">
					<input type="checkbox" id="flv-sync-builder-collapse" value="1" />
					<span><?php esc_html_e( 'Sync collapse with builder', 'formidable-list-view' ); ?></span>
				</label>
			</div>
		</div>
		<div
			id="flv-field-tree"
			class="flv-tree frm-scrollbar-wrapper"
			data-form-id="<?php echo esc_attr( $form->id ); ?>"
			<?php
			$tree_json = wp_json_encode(
				$tree,
				JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
			);
			?>
			data-tree="<?php echo esc_attr( false !== $tree_json ? $tree_json : '[]' ); ?>"
			role="tree"
			aria-label="<?php esc_attr_e( 'Form fields', 'formidable-list-view' ); ?>"
		></div>
	</div>
</div>
