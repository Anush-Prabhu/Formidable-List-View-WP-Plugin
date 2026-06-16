<?php
/**
 * Builds hierarchical field trees for the List View panel.
 *
 * @package FormidableListView
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( 'You are not allowed to call this page directly.' );
}

/**
 * Tree builder for Formidable form fields.
 */
class FLV_Tree_Builder {

	/**
	 * Cached field type metadata (name + icon).
	 *
	 * @var array|null
	 */
	private static $type_meta = null;

	/**
	 * Build a tree for a form (grouped by pages when page breaks exist).
	 *
	 * @param int $form_id Form ID.
	 * @return array<int, array<string, mixed>>
	 */
	public static function build( $form_id ) {
		$form_id = absint( $form_id );
		if ( ! $form_id || ! class_exists( 'FrmField' ) ) {
			return array();
		}

		$fields = FrmField::get_all_for_form( $form_id, '', 'exclude', 'exclude' );
		if ( empty( $fields ) ) {
			return array();
		}

		$fields = array_values( $fields );
		if ( self::form_has_page_breaks( $fields ) ) {
			return self::build_page_tree( $fields, $form_id );
		}

		return self::parse_fields( $fields, 0, null, array( $form_id ) );
	}

	/**
	 * @param array<int, object> $fields Fields.
	 * @return bool
	 */
	private static function form_has_page_breaks( $fields ) {
		foreach ( $fields as $field ) {
			if ( 'break' === $field->type ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Group fields into page nodes (outermost nesting).
	 *
	 * @param array<int, object> $fields  Ordered fields.
	 * @param int                $form_id Form ID.
	 * @return array<int, array<string, mixed>>
	 */
	private static function build_page_tree( $fields, $form_id ) {
		$pages             = array();
		$chunk             = array();
		$page_num          = 1;
		$leading_break_id  = 0;
		$visited           = array( $form_id );

		foreach ( $fields as $field ) {
			$chunk[] = $field;
			if ( 'break' !== $field->type ) {
				continue;
			}

			$pages[] = self::page_node( $page_num, $chunk, (int) $field->id, $leading_break_id, $form_id, $visited );
			$leading_break_id = (int) $field->id;
			++$page_num;
			$chunk = array();
		}

		if ( ! empty( $chunk ) ) {
			$pages[] = self::page_node( $page_num, $chunk, 0, $leading_break_id, $form_id, $visited );
		}

		return $pages;
	}

	/**
	 * @param int                $page_num         Page number.
	 * @param array<int, object> $chunk            Fields on this page (includes trailing break if any).
	 * @param int                $break_id         Break field ID ending this page (0 for last page without break).
	 * @param int                $leading_break_id Break field ID before this page (0 for page 1).
	 * @param int                $form_id          Form ID.
	 * @param array<int, int>    $visited          Visited form IDs.
	 * @return array<string, mixed>
	 */
	private static function page_node( $page_num, $chunk, $break_id, $leading_break_id, $form_id, $visited ) {
		$title_key = 1 === $page_num ? '0' : (string) $leading_break_id;

		return array(
			'id'               => 'page-' . $page_num,
			'pageNumber'       => $page_num,
			'breakFieldId'     => $break_id,
			'leadingBreakId'   => $leading_break_id,
			'rootlineTitleKey' => $title_key,
			'label'            => self::resolve_page_label( $form_id, $page_num, $leading_break_id, $chunk ),
			'type'            => 'page',
			'typeLabel'       => __( 'Page', 'formidable-list-view' ),
			'icon'            => 'frmfont frm_page_break_icon',
			'fieldKey'        => '',
			'fieldId'         => 0,
			'isSynthetic'     => true,
			'required'        => false,
			'visible'         => true,
			'isHiddenType'    => false,
			'canEditLabel'    => false,
			'canEditRequired' => false,
			'canEditVisible'  => false,
			'isContainer'     => true,
			'container'       => 'page',
			'children'        => self::parse_fields( $chunk, 0, null, $visited ),
		);
	}

	/**
	 * Rootline page titles from form settings (#frm-single-settings-rootline).
	 *
	 * @param int $form_id Form ID.
	 * @return array<int|string, string>
	 */
	private static function get_rootline_titles( $form_id ) {
		if ( class_exists( 'FrmProFormsHelper' ) ) {
			return FrmProFormsHelper::get_form_option( $form_id, 'rootline_titles', array() );
		}

		if ( class_exists( 'FrmForm' ) ) {
			$form = FrmForm::getOne( $form_id );
			if ( $form && ! empty( $form->options['rootline_titles'] ) && is_array( $form->options['rootline_titles'] ) ) {
				return $form->options['rootline_titles'];
			}
		}

		return array();
	}

	/**
	 * Prefer rootline titles (Progress indicator settings), then break name, then first field label.
	 *
	 * @param int                $form_id          Form ID.
	 * @param int                $page_num         Page number.
	 * @param int                $leading_break_id Break field ID before this page.
	 * @param array<int, object> $chunk            Page fields.
	 * @return string
	 */
	private static function resolve_page_label( $form_id, $page_num, $leading_break_id, $chunk ) {
		$titles = self::get_rootline_titles( $form_id );
		$key    = 1 === $page_num ? 0 : $leading_break_id;

		foreach ( array( $key, (string) $key ) as $lookup_key ) {
			if ( isset( $titles[ $lookup_key ] ) && '' !== trim( (string) $titles[ $lookup_key ] ) ) {
				return self::prefix_page_star( trim( (string) $titles[ $lookup_key ] ) );
			}
		}

		if ( $leading_break_id && class_exists( 'FrmField' ) ) {
			$break = FrmField::getOne( $leading_break_id );
			if ( $break && ! empty( $break->name ) ) {
				return self::prefix_page_star( $break->name );
			}
		}

		foreach ( $chunk as $field ) {
			if ( in_array( $field->type, array( 'end_divider', 'break' ), true ) ) {
				continue;
			}
			$label = self::get_field_label( $field );
			if ( $label ) {
				return self::prefix_page_star( $label );
			}
		}

		return self::prefix_page_star(
			sprintf(
				/* translators: %d: page number */
				__( 'Page %d', 'formidable-list-view' ),
				$page_num
			)
		);
	}

	/**
	 * Prefix page break titles with a star for List View display.
	 *
	 * @param string $label Page title.
	 * @return string
	 */
	private static function prefix_page_star( $label ) {
		$text = trim( (string) $label );
		if ( '' === $text ) {
			return '★';
		}

		$first = function_exists( 'mb_substr' ) ? mb_substr( $text, 0, 1 ) : substr( $text, 0, 1 );
		if ( '★' === $first || '*' === $first ) {
			return $text;
		}

		return '★ ' . $text;
	}

	/**
	 * Parse a flat ordered field list into a nested tree.
	 *
	 * @param array<int, object> $fields        Ordered fields.
	 * @param int                $start         Start index.
	 * @param int|null           $end           End index (exclusive).
	 * @param array<int, int>    $visited_forms Form IDs already loaded (cycle guard).
	 * @return array<int, array<string, mixed>>
	 */
	private static function parse_fields( $fields, $start = 0, $end = null, $visited_forms = array() ) {
		$end  = null === $end ? count( $fields ) : $end;
		$tree = array();
		$i    = $start;

		while ( $i < $end ) {
			$field = $fields[ $i ];

			if ( 'end_divider' === $field->type ) {
				++$i;
				continue;
			}

			$node = self::field_to_node( $field );

			if ( 'divider' === $field->type ) {
				$inner_end = self::find_section_end( $fields, $i, $end );

				if ( class_exists( 'FrmField' ) && FrmField::is_repeating_field( $field ) && ! empty( $field->field_options['form_select'] ) ) {
					$child_form_id     = absint( $field->field_options['form_select'] );
					$node['children']  = self::load_child_form_tree( $child_form_id, $visited_forms );
					$node['container'] = 'repeater';
					$node['isContainer'] = true;
				} else {
					$node['children']  = self::parse_fields( $fields, $i + 1, $inner_end, $visited_forms );
					$node['container'] = 'section';
					$node['isContainer'] = true;
				}

				$i = $inner_end + 1;
			} elseif ( 'form' === $field->type && ! empty( $field->field_options['form_select'] ) ) {
				$embed_form_id       = absint( $field->field_options['form_select'] );
				$node['children']    = self::load_child_form_tree( $embed_form_id, $visited_forms );
				$node['container']   = 'embed';
				$node['isContainer'] = true;
				++$i;
			} else {
				++$i;
			}

			$tree[] = $node;
		}

		return $tree;
	}

	/**
	 * Load nested fields for a repeater or embedded form.
	 *
	 * @param int             $child_form_id Child form ID.
	 * @param array<int, int> $visited_forms Visited form IDs.
	 * @return array<int, array<string, mixed>>
	 */
	private static function load_child_form_tree( $child_form_id, $visited_forms ) {
		$child_form_id = absint( $child_form_id );
		if ( ! $child_form_id || in_array( $child_form_id, $visited_forms, true ) ) {
			return array();
		}

		$child_fields = array_values( FrmField::get_all_for_form( $child_form_id, '', 'exclude', 'exclude' ) );
		if ( empty( $child_fields ) ) {
			return array();
		}

		$visited = array_merge( $visited_forms, array( $child_form_id ) );
		return self::parse_fields( $child_fields, 0, null, $visited );
	}

	/**
	 * Find the index of the matching end_divider for a section divider.
	 *
	 * @param array<int, object> $fields Fields list.
	 * @param int                $start  Divider index.
	 * @param int                $end    List end.
	 * @return int
	 */
	private static function find_section_end( $fields, $start, $end ) {
		$depth = 1;
		$j     = $start + 1;

		while ( $j < $end && $depth > 0 ) {
			if ( 'divider' === $fields[ $j ]->type ) {
				++$depth;
			} elseif ( 'end_divider' === $fields[ $j ]->type ) {
				--$depth;
			}
			++$j;
		}

		return min( $j - 1, $end - 1 );
	}

	/**
	 * Convert a field object to a list-view node.
	 *
	 * @param object $field Field object.
	 * @return array<string, mixed>
	 */
	private static function field_to_node( $field ) {
		$options   = is_array( $field->field_options ) ? $field->field_options : array();
		$type_meta = self::get_type_meta( $field->type, $field, $options );
		$label     = self::get_field_label( $field );

		$admin_only = isset( $options['admin_only'] ) ? $options['admin_only'] : ( isset( $field->admin_only ) ? $field->admin_only : '' );
		if ( 1 === $admin_only || '1' === $admin_only ) {
			$admin_only = 'administrator';
		}

		$is_hidden_type = 'hidden' === $field->type;
		$is_visible     = ! $is_hidden_type && self::is_admin_only_public( $admin_only );
		$is_container   = in_array( $field->type, array( 'divider', 'form' ), true );

		return array(
			'id'              => (int) $field->id,
			'label'           => $label,
			'type'            => $field->type,
			'typeLabel'       => $type_meta['name'],
			'icon'            => self::sanitize_icon_class( $type_meta['icon'] ),
			'fieldKey'        => $field->field_key,
			'fieldId'         => (int) $field->id,
			'isSynthetic'     => false,
			'visible'         => $is_visible,
			'isHiddenType'    => $is_hidden_type,
			'canEditLabel'    => self::can_edit_label( $field->type ),
			'canEditVisible'  => self::can_edit_visible( $field->type ),
			'isContainer'     => $is_container,
			'container'       => '',
			'children'        => array(),
		);
	}

	/**
	 * @param object $field Field.
	 * @return string
	 */
	private static function get_field_label( $field ) {
		if ( ! empty( $field->name ) ) {
			return $field->name;
		}

		if ( 'html' === $field->type && ! empty( $field->description ) ) {
			$stripped = wp_strip_all_tags( $field->description );
			if ( $stripped ) {
				return self::truncate( $stripped, 48 );
			}
		}

		$type_meta = self::get_type_meta( $field->type, $field, array() );
		return $type_meta['name'];
	}

	/**
	 * @param string $text   Text.
	 * @param int    $length Max length.
	 * @return string
	 */
	private static function truncate( $text, $length ) {
		$text = trim( preg_replace( '/\s+/', ' ', $text ) );
		if ( strlen( $text ) <= $length ) {
			return $text;
		}
		return substr( $text, 0, $length - 1 ) . '…';
	}

	/**
	 * @param mixed $admin_only Admin only setting.
	 * @return bool
	 */
	private static function is_admin_only_public( $admin_only ) {
		if ( empty( $admin_only ) || '0' === $admin_only || 0 === $admin_only ) {
			return true;
		}
		if ( is_array( $admin_only ) && ( empty( $admin_only ) || ( 1 === count( $admin_only ) && '' === $admin_only[0] ) ) ) {
			return true;
		}
		return false;
	}

	/**
	 * @param string $type Field type.
	 * @return bool
	 */
	private static function can_edit_label( $type ) {
		return ! in_array( $type, array( 'end_divider', 'break' ), true );
	}

	/**
	 * @param string $type Field type.
	 * @return bool
	 */
	private static function can_edit_visible( $type ) {
		$skip = array( 'end_divider', 'break', 'submit' );
		if ( class_exists( 'FrmSubmitHelper' ) && $type === FrmSubmitHelper::FIELD_TYPE ) {
			return false;
		}
		return ! in_array( $type, $skip, true );
	}

	/**
	 * @param string               $type    Field type.
	 * @param object               $field   Field object.
	 * @param array<string, mixed> $options Field options.
	 * @return array{name: string, icon: string}
	 */
	private static function get_type_meta( $type, $field, $options ) {
		if ( null === self::$type_meta ) {
			self::$type_meta = array();
			if ( class_exists( 'FrmField' ) ) {
				self::$type_meta = FrmField::field_selection();
				if ( method_exists( 'FrmField', 'pro_field_selection' ) ) {
					self::$type_meta = array_merge( self::$type_meta, FrmField::pro_field_selection() );
				}
			}
		}

		$lookup_type = $type;
		if ( 'divider' === $type && ! empty( $options['repeat'] ) ) {
			$lookup_type = 'divider|repeat';
		}

		if ( isset( self::$type_meta[ $lookup_type ] ) ) {
			return array(
				'name' => self::$type_meta[ $lookup_type ]['name'],
				'icon' => self::sanitize_icon_class(
					isset( self::$type_meta[ $lookup_type ]['icon'] ) ? self::$type_meta[ $lookup_type ]['icon'] : 'frmfont frm_text2_icon'
				),
			);
		}

		return array(
			'name' => ucfirst( str_replace( '_', ' ', $type ) ),
			'icon' => 'frmfont frm_text2_icon',
		);
	}

	/**
	 * Allow only Formidable icon font classes in tree output.
	 *
	 * @param string $icon Space-separated CSS classes.
	 * @return string
	 */
	private static function sanitize_icon_class( $icon ) {
		$default = 'frmfont frm_text2_icon';

		if ( ! is_string( $icon ) || '' === trim( $icon ) ) {
			return $default;
		}

		$safe = array();
		foreach ( preg_split( '/\s+/', trim( $icon ) ) as $class ) {
			$class = sanitize_html_class( $class );
			if ( '' === $class ) {
				continue;
			}
			if ( 'frmfont' === $class || 0 === strpos( $class, 'frm_' ) ) {
				$safe[] = $class;
			}
		}

		return $safe ? implode( ' ', array_unique( $safe ) ) : $default;
	}
}
