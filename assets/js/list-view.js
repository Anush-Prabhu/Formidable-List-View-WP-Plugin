( function ( $, config ) {
	'use strict';

	if ( ! config || ! config.formId ) {
		return;
	}

	const treeRoot = document.getElementById( 'flv-field-tree' );
	if ( ! treeRoot ) {
		return;
	}

	let treeData = [];
	let selectedId = null;
	let searchQuery = '';
	let collapseToPages = false;
	let syncBuilderCollapse = false;
	const expanded = new Set();
	let refreshInFlight = false;

	function nodeKey( id ) {
		return String( id );
	}

	function cssEscape( value ) {
		if ( window.CSS && typeof CSS.escape === 'function' ) {
			return CSS.escape( String( value ) );
		}
		return String( value ).replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' );
	}

	function queryTreeNode( id ) {
		return treeRoot.querySelector( '.flv-node[data-field-id="' + cssEscape( nodeKey( id ) ) + '"]' );
	}

	function debounce( fn, delay, timerRef ) {
		return function () {
			const args = arguments;
			const ctx = this;
			if ( timerRef.current ) {
				clearTimeout( timerRef.current );
			}
			timerRef.current = setTimeout( () => fn.apply( ctx, args ), delay );
		};
	}

	const renderTimerRef = { current: null };
	const refreshTimerRef = { current: null };
	const searchTimerRef = { current: null };

	function scheduleRender() {
		if ( renderTimerRef.current ) {
			clearTimeout( renderTimerRef.current );
		}
		renderTimerRef.current = setTimeout( render, 32 );
	}

	function stripPageStar( label ) {
		const text = String( label || '' ).trim();
		if ( ! text ) {
			return '';
		}
		if ( text.charAt( 0 ) === '★' || text.charAt( 0 ) === '*' ) {
			return text.replace( /^[★*]\s*/, '' ).trim();
		}
		return text;
	}

	function prefixPageStar( label ) {
		const text = stripPageStar( label );
		if ( ! text ) {
			return '★';
		}
		return '★ ' + text;
	}

	function getPageDisplayLabel( node ) {
		return prefixPageStar( node.label || node.typeLabel || '' );
	}

	/**
	 * Prefer live rootline titles from Progress indicator settings (#frm-single-settings-rootline).
	 *
	 * @param {Array} nodes Tree nodes.
	 */
	function applyRootlineTitles( nodes ) {
		nodes.forEach( ( node ) => {
			if ( node.type === 'page' ) {
				const domTitle = node.rootlineTitleKey !== undefined ? getRootlineTitleFromDom( node.rootlineTitleKey ) : '';
				node.label = prefixPageStar( domTitle || node.label || '' );
			}
			if ( node.children && node.children.length ) {
				applyRootlineTitles( node.children );
			}
		} );
	}

	function getRootlineTitleFromDom( key ) {
		const container = document.getElementById( 'frm-rootline-titles' );
		if ( ! container ) {
			return '';
		}
		const input = container.querySelector( 'input[name="frm_rootline[titles][' + cssEscape( String( key ) ) + ']"]' );
		return input && input.value ? input.value.trim() : '';
	}

	function loadInitialTree() {
		try {
			treeData = JSON.parse( treeRoot.getAttribute( 'data-tree' ) || '[]' );
		} catch ( e ) {
			treeData = [];
		}
		initDefaultExpansion();
		render();
	}

	function initDefaultExpansion() {
		expanded.clear();
		if ( collapseToPages ) {
			return;
		}
		treeData.forEach( ( node ) => {
			if ( node.type === 'page' ) {
				expanded.add( nodeKey( node.id ) );
			}
		} );
	}

	function refreshTree() {
		if ( ! config.restUrl || refreshInFlight ) {
			return;
		}
		refreshInFlight = true;
		fetch( config.restUrl, {
			headers: { 'X-WP-Nonce': config.restNonce },
		} )
			.then( ( response ) => response.json() )
			.then( ( data ) => {
				if ( data && Array.isArray( data.tree ) ) {
					treeData = data.tree;
					initDefaultExpansion();
					render();
				}
			} )
			.catch( () => {} )
			.finally( () => {
				refreshInFlight = false;
			} );
	}

	const scheduleRefresh = debounce( refreshTree, 600, refreshTimerRef );

	function filterNodes( nodes, query ) {
		if ( ! query ) {
			return nodes;
		}
		const q = query.toLowerCase();
		const filtered = [];
		nodes.forEach( ( node ) => {
			const childMatches = node.children ? filterNodes( node.children, query ) : [];
			const idStr = String( node.fieldId || node.id );
			const labelText = node.type === 'page' ? stripPageStar( node.label ) : node.label;
			const selfMatch =
				( labelText && labelText.toLowerCase().includes( q ) ) ||
				( node.fieldKey && node.fieldKey.toLowerCase().includes( q ) ) ||
				( node.typeLabel && node.typeLabel.toLowerCase().includes( q ) ) ||
				idStr.includes( q );
			if ( selfMatch || childMatches.length ) {
				const copy = Object.assign( {}, node );
				if ( childMatches.length ) {
					copy.children = childMatches;
					expanded.add( nodeKey( node.id ) );
				}
				filtered.push( copy );
			}
		} );
		return filtered;
	}

	function render() {
		applyRootlineTitles( treeData );
		const visible = filterNodes( treeData, searchQuery );
		treeRoot.innerHTML = '';

		if ( ! visible.length ) {
			const empty = document.createElement( 'p' );
			empty.className = 'flv-empty';
			empty.textContent = config.i18n.emptyTree;
			treeRoot.appendChild( empty );
			return;
		}

		const list = document.createElement( 'ul' );
		list.className = 'flv-tree-root flv-tree-children';
		list.setAttribute( 'data-parent-id', '0' );
		visible.forEach( ( node ) => list.appendChild( renderNode( node, 0 ) ) );
		treeRoot.appendChild( list );

		treeRoot.querySelectorAll( '.flv-tree-children' ).forEach( ( childList ) => {
			if ( childList.classList.contains( 'flv-tree-root' ) ) {
				return;
			}
			initSortable( childList );
		} );
	}

	function renderNode( node, depth ) {
		const li = document.createElement( 'li' );
		const key = nodeKey( node.id );
		li.className = 'flv-node';
		li.setAttribute( 'data-field-id', key );
		li.setAttribute( 'data-field-type', node.type || '' );
		li.setAttribute( 'role', 'treeitem' );
		li.setAttribute( 'aria-expanded', node.isContainer ? String( expanded.has( key ) ) : 'false' );

		const row = document.createElement( 'div' );
		row.className = 'flv-row' + ( selectedId === key ? ' is-selected' : '' );
		row.style.setProperty( '--flv-depth', String( depth ) );

		if ( ! node.isSynthetic && node.type !== 'page' && node.type !== 'break' ) {
			const drag = document.createElement( 'a' );
			drag.href = '#';
			drag.className = 'flv-drag-handle frm_bstooltip frm-move frm-hover-icon frmfont frm_thick_move_icon';
			drag.setAttribute( 'aria-label', config.i18n.dragHandle );
			drag.setAttribute( 'title', config.i18n.dragHandle );
			drag.addEventListener( 'click', ( event ) => event.preventDefault() );
			row.appendChild( drag );
		} else {
			const dragSpacer = document.createElement( 'span' );
			dragSpacer.className = 'flv-drag-spacer';
			row.appendChild( dragSpacer );
		}

		if ( node.isContainer ) {
			const toggle = document.createElement( 'button' );
			toggle.type = 'button';
			toggle.className = 'flv-toggle' + ( expanded.has( key ) ? ' is-expanded' : '' );
			toggle.setAttribute( 'aria-label', expanded.has( key ) ? config.i18n.collapse : config.i18n.expand );
			toggle.innerHTML = '<span class="flv-chevron" aria-hidden="true"></span>';
			toggle.addEventListener( 'click', ( event ) => {
				event.stopPropagation();
				const willExpand = ! expanded.has( key );
				if ( willExpand ) {
					expanded.add( key );
				} else {
					expanded.delete( key );
				}
				if ( node.type === 'page' && syncBuilderCollapse ) {
					syncCanvasPage( node, ! willExpand );
				}
				scheduleRender();
			} );
			row.appendChild( toggle );
		} else {
			const spacer = document.createElement( 'span' );
			spacer.className = 'flv-toggle-spacer';
			row.appendChild( spacer );
		}

		const icon = document.createElement( 'span' );
		icon.className = 'flv-type-icon ' + ( node.icon || 'frmfont frm_text2_icon' );
		icon.setAttribute( 'aria-hidden', 'true' );
		row.appendChild( icon );

		const labelWrap = document.createElement( 'span' );
		labelWrap.className = 'flv-label-wrap';

		const labelText = document.createElement( 'span' );
		labelText.className = 'flv-label-text';
		labelText.textContent = node.type === 'page' ? getPageDisplayLabel( node ) : ( node.label || node.typeLabel );
		labelWrap.appendChild( labelText );

		if ( node.fieldKey ) {
			const badge = document.createElement( 'span' );
			badge.className = 'flv-badge';
			badge.textContent = node.fieldKey;
			labelWrap.appendChild( badge );
		}

		if ( node.fieldId && ! node.isSynthetic ) {
			const idBadge = document.createElement( 'span' );
			idBadge.className = 'flv-badge flv-badge-id';
			idBadge.textContent = 'ID ' + node.fieldId;
			labelWrap.appendChild( idBadge );
		}

		row.appendChild( labelWrap );

		const actions = document.createElement( 'div' );
		actions.className = 'flv-row-actions';
		const menuBtn = document.createElement( 'button' );
		menuBtn.type = 'button';
		menuBtn.className = 'flv-menu-btn';
		menuBtn.setAttribute( 'aria-label', config.i18n.moreOptions );
		menuBtn.setAttribute( 'title', config.i18n.moreOptions );
		menuBtn.innerHTML = '<span class="flv-menu-dots" aria-hidden="true">&#8942;</span>';
		menuBtn.addEventListener( 'click', ( event ) => {
			event.stopPropagation();
			event.preventDefault();
			toggleRowMenu( menuBtn, node );
		} );
		actions.appendChild( menuBtn );
		row.appendChild( actions );

		row.addEventListener( 'click', ( event ) => {
			if ( event.target.closest( '.flv-inline-controls, .flv-toggle, .flv-menu-btn, .flv-drag-handle, [data-flv-row-menu]' ) ) {
				return;
			}
			if ( node.isSynthetic ) {
				const toggleBtn = row.querySelector( '.flv-toggle' );
				if ( toggleBtn ) {
					toggleBtn.click();
				}
				return;
			}
			selectField( node.id, true );
		} );

		li.appendChild( row );

		if ( selectedId === key && ! node.isSynthetic ) {
			li.appendChild( renderInlineControls( node, depth ) );
		}

		const showChildren = node.isContainer && node.children && node.children.length && expanded.has( key );

		if ( showChildren ) {
			const childList = document.createElement( 'ul' );
			childList.className = 'flv-tree-children';
			if ( node.type === 'page' && node.pageNumber ) {
				childList.setAttribute( 'data-page-number', String( node.pageNumber ) );
				childList.setAttribute( 'data-parent-id', '0' );
			} else {
				childList.setAttribute( 'data-parent-id', node.isSynthetic ? key : String( node.id ) );
			}
			node.children.forEach( ( child ) => childList.appendChild( renderNode( child, depth + 1 ) ) );
			li.appendChild( childList );
		}

		return li;
	}

	function renderInlineControls( node, depth ) {
		const panel = document.createElement( 'div' );
		panel.className = 'flv-inline-controls';
		panel.style.setProperty( '--flv-depth', String( depth ) );

		if ( node.canEditLabel ) {
			const labelInput = document.createElement( 'input' );
			labelInput.type = 'text';
			labelInput.className = 'flv-input flv-label-input';
			labelInput.value = node.label || '';
			labelInput.placeholder = config.i18n.label;
			labelInput.addEventListener( 'change', () => syncLabel( node.id, labelInput.value ) );
			panel.appendChild( labelInput );
		}

		if ( node.canEditVisible ) {
			const visLabel = document.createElement( 'label' );
			visLabel.className = 'flv-chip flv-chip-visible';
			const vis = document.createElement( 'input' );
			vis.type = 'checkbox';
			vis.checked = !! node.visible;
			vis.disabled = !! node.isHiddenType;
			vis.addEventListener( 'change', () => syncVisible( node.id, vis.checked ) );
			visLabel.append( vis, document.createTextNode( ' ' + config.i18n.visible ) );
			panel.appendChild( visLabel );
		}

		return panel;
	}

	let openMenuState = null;

	function createFormidableMenuItem( item, onClick ) {
		const wrap = document.createElement( 'div' );
		wrap.className = 'frm_more_options_li dropdown-item';

		const link = document.createElement( 'a' );
		link.className = item.actionClass;
		link.href = '#';
		link.setAttribute( 'role', 'button' );
		link.setAttribute( 'tabindex', '0' );

		const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svg.setAttribute( 'class', 'frmsvg' );
		const use = document.createElementNS( 'http://www.w3.org/2000/svg', 'use' );
		use.setAttribute( 'href', '#' + item.icon );
		svg.appendChild( use );
		link.appendChild( svg );
		link.append( document.createTextNode( ' ' ) );

		const label = document.createElement( 'span' );
		label.textContent = item.label;
		link.appendChild( label );

		link.addEventListener( 'click', ( event ) => {
			event.preventDefault();
			event.stopPropagation();
			closeMenus();
			onClick();
		} );

		wrap.appendChild( link );
		return wrap;
	}

	function resolveCanvasFieldId( node ) {
		if ( node.type === 'page' ) {
			if ( node.leadingBreakId ) {
				return node.leadingBreakId;
			}
			if ( node.breakFieldId ) {
				return node.breakFieldId;
			}
			return null;
		}

		if ( node.fieldId ) {
			return node.fieldId;
		}

		const id = parseInt( node.id, 10 );
		return id || null;
	}

	function runMenuAction( node, actionClass ) {
		const action = actionClass.split( ' ' )[0];

		if ( node.type !== 'page' && ! node.isSynthetic ) {
			highlightRow( node.id );
		}

		if ( action.indexOf( 'frm_select' ) === 0 && node.type === 'page' ) {
			openRootlineSettings();
			return;
		}

		const fieldId = resolveCanvasFieldId( node );
		if ( ! fieldId ) {
			return;
		}

		triggerFieldAction( fieldId, action );
	}

	function appendStandardFieldMenu( node, menu ) {
		const standardItems = [
			{
				actionClass: 'frm_delete_field',
				icon: 'frm_delete_icon',
				label: config.i18n.delete,
			},
			{
				actionClass: 'frm_clone_field',
				icon: 'frm_clone_icon',
				label: config.i18n.duplicate,
			},
			{
				actionClass: 'frm_select_field',
				icon: 'frm_settings_icon',
				label: config.i18n.fieldSettings,
			},
		];

		standardItems.forEach( ( item ) => {
			menu.appendChild(
				createFormidableMenuItem( item, () => runMenuAction( node, item.actionClass ) )
			);
		} );
	}

	function appendMenuFromCanvasLinks( node, menu, canvasLinks, anchor ) {
		menu.innerHTML = '';

		canvasLinks.forEach( ( canvasLink ) => {
			const actionClass = canvasLink.className.split( ' ' )[0];
			const item = {
				actionClass: canvasLink.className,
				icon: 'frm_settings_icon',
				label: canvasLink.querySelector( 'span' )
					? canvasLink.querySelector( 'span' ).textContent
					: canvasLink.textContent.trim(),
			};
			const iconUse = canvasLink.querySelector( 'use' );
			if ( iconUse ) {
				const href = iconUse.getAttribute( 'href' ) || iconUse.getAttributeNS( 'http://www.w3.org/1999/xlink', 'href' );
				if ( href && href.indexOf( '#' ) !== -1 ) {
					item.icon = href.replace( '#', '' );
				}
			}

			menu.appendChild(
				createFormidableMenuItem( item, () => runMenuAction( node, actionClass ) )
			);
		} );

		if ( anchor ) {
			positionRowMenu( menu, anchor );
		}
	}

	function runFieldActionFallback( fieldId, actionClass ) {
		const action = actionClass.split( ' ' )[0];
		if ( action.indexOf( 'frm_delete' ) === 0 ) {
			deleteField( fieldId );
		} else if ( action.indexOf( 'frm_clone' ) === 0 ) {
			duplicateField( fieldId );
		} else if ( action.indexOf( 'frm_select' ) === 0 ) {
			openFieldOptions( fieldId );
		}
	}

	function triggerFieldAction( fieldId, actionClass ) {
		const fieldLi = document.getElementById( 'frm_field_id_' + fieldId );
		if ( ! fieldLi ) {
			runFieldActionFallback( fieldId, actionClass );
			return;
		}

		const clickCanvasLink = () => {
			const action = actionClass.split( ' ' )[0];
			let link = fieldLi.querySelector( '.' + action );
			if ( ! link && action.endsWith( '_field' ) ) {
				link = fieldLi.querySelector( '.' + action.replace( '_field', '_field_group' ) );
			}
			if ( link ) {
				link.click();
				scheduleRefresh();
				return true;
			}
			return false;
		};

		const icons = fieldLi.querySelector( '.frm-field-action-icons' );
		const canvasMenu = fieldLi.querySelector( '.frm-dropdown-menu' );
		if ( icons && canvasMenu ) {
			canvasMenu.innerHTML = '';
			$( icons ).trigger( 'show.bs.dropdown' );
			setTimeout( () => {
				if ( ! clickCanvasLink() ) {
					runFieldActionFallback( fieldId, actionClass );
				}
			}, 60 );
			return;
		}

		if ( ! clickCanvasLink() ) {
			runFieldActionFallback( fieldId, actionClass );
		}
	}

	function positionRowMenu( menu, anchor ) {
		const rect = anchor.getBoundingClientRect();
		const menuWidth = menu.offsetWidth || 168;
		const menuHeight = menu.offsetHeight || 0;
		const gap = 0;
		const edge = 8;
		const spaceBelow = window.innerHeight - rect.bottom - edge;
		const spaceAbove = rect.top - edge;
		let top;

		if ( menuHeight <= spaceBelow || spaceBelow >= spaceAbove ) {
			top = rect.bottom + gap;
			if ( menuHeight > spaceBelow && spaceAbove >= spaceBelow ) {
				top = rect.top - menuHeight - gap;
			}
		} else {
			top = rect.top - menuHeight - gap;
		}

		let left = rect.right - menuWidth;
		if ( left < edge ) {
			left = edge;
		}

		menu.style.position = 'fixed';
		menu.style.top = Math.round( top ) + 'px';
		menu.style.left = Math.round( left ) + 'px';
		menu.style.zIndex = '100050';
	}

	function toggleRowMenu( anchor, node ) {
		closeMenus();

		const menu = document.createElement( 'div' );
		menu.className = 'flv-row-menu frm-dropdown-menu frm-p-1 dropdown-menu show';
		menu.setAttribute( 'role', 'menu' );
		menu.setAttribute( 'data-flv-row-menu', '1' );
		menu.setAttribute( 'aria-label', config.i18n.moreOptions );

		populateFieldRowMenu( node, menu, anchor );

		document.body.appendChild( menu );
		positionRowMenu( menu, anchor );
		requestAnimationFrame( () => positionRowMenu( menu, anchor ) );

		const reposition = () => positionRowMenu( menu, anchor );
		openMenuState = { menu, reposition };
		window.addEventListener( 'scroll', reposition, true );
		window.addEventListener( 'resize', reposition );
	}

	function populateFieldRowMenu( node, menu, anchor ) {
		appendStandardFieldMenu( node, menu );

		const fieldId = resolveCanvasFieldId( node );
		if ( ! fieldId ) {
			return;
		}

		const fieldLi = document.getElementById( 'frm_field_id_' + fieldId );
		if ( ! fieldLi ) {
			return;
		}

		const icons = fieldLi.querySelector( '.frm-field-action-icons' );
		const canvasMenu = fieldLi.querySelector( '.frm-dropdown-menu' );
		if ( ! icons || ! canvasMenu ) {
			return;
		}

		canvasMenu.innerHTML = '';
		canvasMenu.classList.add( 'show' );
		$( icons ).trigger( 'show.bs.dropdown' );

		setTimeout( () => {
			if ( ! menu.isConnected ) {
				canvasMenu.classList.remove( 'show' );
				canvasMenu.innerHTML = '';
				return;
			}

			const canvasLinks = canvasMenu.querySelectorAll( '.dropdown-item a' );
			if ( canvasLinks.length >= 3 ) {
				appendMenuFromCanvasLinks( node, menu, canvasLinks, anchor );
			}

			canvasMenu.classList.remove( 'show' );
			canvasMenu.innerHTML = '';
		}, 60 );
	}

	function closeMenus() {
		if ( openMenuState ) {
			window.removeEventListener( 'scroll', openMenuState.reposition, true );
			window.removeEventListener( 'resize', openMenuState.reposition );
			openMenuState = null;
		}
		document.querySelectorAll( '[data-flv-row-menu]' ).forEach( ( el ) => el.remove() );
	}

	document.addEventListener( 'click', ( event ) => {
		if ( ! event.target.closest( '.flv-menu-btn, [data-flv-row-menu]' ) ) {
			closeMenus();
		}
	} );

	function updateSelectionUI() {
		treeRoot.querySelectorAll( '.flv-row.is-selected' ).forEach( ( row ) => {
			row.classList.remove( 'is-selected' );
		} );
		treeRoot.querySelectorAll( '.flv-inline-controls' ).forEach( ( el ) => el.remove() );

		if ( ! selectedId ) {
			return;
		}

		const li = queryTreeNode( selectedId );
		if ( ! li ) {
			return;
		}

		const row = li.querySelector( ':scope > .flv-row' );
		if ( row ) {
			row.classList.add( 'is-selected' );
		}

		const node = findNode( treeData, selectedId );
		if ( node && ! node.isSynthetic ) {
			const depth = parseInt( li.querySelector( '.flv-row' )?.style.getPropertyValue( '--flv-depth' ) || '0', 10 );
			li.appendChild( renderInlineControls( node, depth ) );
		}
	}

	function findNode( nodes, id ) {
		const key = nodeKey( id );
		for ( let i = 0; i < nodes.length; i++ ) {
			const node = nodes[i];
			if ( nodeKey( node.id ) === key ) {
				return node;
			}
			if ( node.children ) {
				const found = findNode( node.children, id );
				if ( found ) {
					return found;
				}
			}
		}
		return null;
	}

	function highlightRow( fieldId ) {
		selectedId = nodeKey( fieldId );
		updateSelectionUI();
	}

	function selectField( fieldId, scrollToCanvas ) {
		const key = nodeKey( fieldId );
		if ( selectedId === key && ! scrollToCanvas ) {
			return;
		}
		selectedId = key;

		if ( ! String( fieldId ).startsWith( 'page-' ) ) {
			const canvasField = document.getElementById( 'frm_field_id_' + fieldId );
			if ( canvasField ) {
				if ( scrollToCanvas ) {
					canvasField.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
				}
				canvasField.click();
			}
		}

		updateSelectionUI();
	}

	function openFieldOptions( fieldId ) {
		selectField( fieldId, true );
		const tab = document.getElementById( 'frm-options-panel-tab' );
		if ( tab ) {
			tab.click();
		}
	}

	function openRootlineSettings() {
		const rootlineTrigger = document.querySelector( '.frm-show-field-settings[data-fid="rootline"]' );
		if ( rootlineTrigger ) {
			rootlineTrigger.click();
		}
		const tab = document.getElementById( 'frm-options-panel-tab' );
		if ( tab ) {
			tab.click();
		}
	}

	function duplicateField( fieldId ) {
		$.post( config.ajaxUrl, {
			action: 'frm_duplicate_field',
			field_id: fieldId,
			form_id: config.formId,
			nonce: typeof frmGlobal !== 'undefined' ? frmGlobal.nonce : config.nonce,
		} ).always( scheduleRefresh );
	}

	function deleteField( fieldId ) {
		if ( ! window.confirm( config.i18n.confirmDelete ) ) {
			return;
		}
		if ( window.frmAdminBuild && typeof window.frmAdminBuild.deleteField === 'function' ) {
			window.frmAdminBuild.deleteField( fieldId );
			scheduleRefresh();
			return;
		}
		$.post( config.ajaxUrl, {
			action: 'frm_delete_field',
			field_id: fieldId,
			nonce: typeof frmGlobal !== 'undefined' ? frmGlobal.nonce : config.nonce,
		} ).always( scheduleRefresh );
	}

	function syncLabel( fieldId, value ) {
		const input = document.getElementById( 'frm_name_' + fieldId );
		if ( ! input ) {
			return;
		}
		input.value = value;
		triggerFieldOptionChange( input );
		const labelOnCanvas = document.getElementById( 'field_label_' + fieldId );
		if ( labelOnCanvas ) {
			labelOnCanvas.textContent = value;
		}
		updateLocalNode( fieldId, { label: value } );
	}

	function syncVisible( fieldId, visible ) {
		const adminSelect = document.getElementById( 'field_options_admin_only_' + fieldId );
		if ( adminSelect ) {
			const $sel = $( adminSelect );
			$sel.val( visible ? [ '' ] : [ 'loggedout' ] );
			$sel.trigger( 'change' );
			updateLocalNode( fieldId, { visible: visible } );
			return;
		}
		updateLocalNode( fieldId, { visible: visible } );
	}

	function triggerFieldOptionChange( input, type ) {
		const eventType = type || 'change';
		input.dispatchEvent( new Event( eventType, { bubbles: true } ) );
	}

	function updateLocalNode( fieldId, patch ) {
		const walk = ( nodes ) => {
			nodes.forEach( ( node ) => {
				if ( nodeKey( node.id ) === nodeKey( fieldId ) ) {
					Object.assign( node, patch );
				}
				if ( node.children ) {
					walk( node.children );
				}
			} );
		};
		walk( treeData );
	}

	let selectionSyncTimer = null;
	function syncSelectionHighlight() {
		if ( selectionSyncTimer ) {
			return;
		}
		selectionSyncTimer = setTimeout( () => {
			selectionSyncTimer = null;
			const selected = document.querySelector( '#frm-show-fields li.selected' );
			if ( ! selected ) {
				return;
			}
			const fid = selected.getAttribute( 'data-fid' );
			if ( fid && nodeKey( fid ) !== selectedId ) {
				selectedId = nodeKey( fid );
				updateSelectionUI();
			}
		}, 80 );
	}

	function initSortable( list ) {
		const $list = $( list );
		if ( $list.hasClass( 'ui-sortable' ) ) {
			$list.sortable( 'destroy' );
		}
		$list.sortable( {
			items: '> .flv-node:not([data-field-type="break"]):not([data-field-type="page"])',
			handle: '.flv-drag-handle',
			cancel: '.flv-menu-btn, .flv-toggle, input, textarea, select, button:not(.flv-drag-handle)',
			axis: 'y',
			tolerance: 'pointer',
			placeholder: 'flv-sort-placeholder',
			forcePlaceholderSize: true,
			delay: 120,
			update: function () {
				applyListOrderToCanvas( list );
			},
		} );
	}

	function getOrderedFieldIds( list ) {
		return Array.from( list.querySelectorAll( ':scope > .flv-node:not([data-field-type="break"])' ) )
			.map( ( li ) => li.getAttribute( 'data-field-id' ) )
			.filter( ( id ) => id && ! id.startsWith( 'page-' ) );
	}

	function updateFieldOrderInputs( canvasList ) {
		$( canvasList ).children( 'li' ).each( function ( index ) {
			const fid = $( this ).data( 'fid' );
			if ( ! fid ) {
				return;
			}
			const orderInput = document.querySelector( 'input[name="field_options[field_order_' + cssEscape( String( fid ) ) + ']"]' );
			if ( orderInput ) {
				orderInput.value = index + 1;
			}
		} );
	}

	function getCanvasPageRange( pageNumber ) {
		const canvasList = document.getElementById( 'frm-show-fields' );
		if ( ! canvasList ) {
			return null;
		}

		const allTop = Array.from( canvasList.children ).filter( ( el ) => el.tagName === 'LI' );
		const breaks = allTop.filter( ( li ) => li.getAttribute( 'data-type' ) === 'break' );

		let startIdx = 0;
		if ( pageNumber > 1 ) {
			const prevBreak = breaks[ pageNumber - 2 ];
			if ( ! prevBreak ) {
				return null;
			}
			startIdx = allTop.indexOf( prevBreak ) + 1;
		}

		const breakLi = breaks[ pageNumber - 1 ] || null;
		const endIdx = breakLi ? allTop.indexOf( breakLi ) : allTop.length;

		return { canvasList, breakLi };
	}

	function reorderCanvasPageFields( pageNumber, orderedIds ) {
		const range = getCanvasPageRange( pageNumber );
		if ( ! range ) {
			return;
		}

		const insertBefore = range.breakLi;
		orderedIds.forEach( ( fieldId ) => {
			const el = document.getElementById( 'frm_field_id_' + fieldId );
			if ( ! el ) {
				return;
			}
			if ( insertBefore ) {
				insertBefore.parentNode.insertBefore( el, insertBefore );
			} else {
				range.canvasList.appendChild( el );
			}
		} );

		updateFieldOrderInputs( range.canvasList );
	}

	function applyListOrderToCanvas( list ) {
		const pageNumber = list.getAttribute( 'data-page-number' );
		const orderedIds = getOrderedFieldIds( list );

		if ( pageNumber ) {
			reorderCanvasPageFields( parseInt( pageNumber, 10 ), orderedIds );
			scheduleRefresh();
			return;
		}

		const parentId = list.getAttribute( 'data-parent-id' );
		if ( parentId === null || parentId === undefined ) {
			return;
		}

		const canvasList = getCanvasSortableList( parseInt( parentId, 10 ) || 0 );
		if ( ! canvasList ) {
			return;
		}

		const $canvasList = $( canvasList );
		orderedIds.forEach( ( fieldId ) => {
			const $item = $( '#frm_field_id_' + fieldId );
			if ( $item.length ) {
				$canvasList.append( $item );
			}
		} );

		updateFieldOrderInputs( canvasList );
		scheduleRefresh();
	}

	function getCanvasSortableList( parentId ) {
		if ( ! parentId ) {
			return document.getElementById( 'frm-show-fields' );
		}
		const parentLi = document.getElementById( 'frm_field_id_' + parentId );
		if ( ! parentLi ) {
			return null;
		}
		return parentLi.querySelector( 'ul.start_divider.frm_sorting' ) || parentLi.querySelector( 'ul.frm_sorting' );
	}

	function syncCanvasPage( pageNode, shouldCollapse ) {
		let container = null;
		let btn = null;

		if ( pageNode.pageNumber === 1 ) {
			container = document.getElementById( 'frm-fake-page' );
			btn = container ? container.querySelector( '.frm-collapse-page' ) : null;
		} else if ( pageNode.breakFieldId ) {
			const breakLi = document.getElementById( 'frm_field_id_' + pageNode.breakFieldId );
			if ( breakLi ) {
				container = breakLi;
				btn = breakLi.querySelector( '.frm-collapse-page' );
			}
		}

		if ( ! btn || ! container ) {
			return;
		}

		const isCollapsed = container.classList.contains( 'frm-page-collapsed' );
		if ( shouldCollapse && ! isCollapsed ) {
			btn.click();
		} else if ( ! shouldCollapse && isCollapsed ) {
			btn.click();
		}
	}

	function collapseAllBuilderPages() {
		const fakePage = document.getElementById( 'frm-fake-page' );
		if ( fakePage ) {
			const fakeBtn = fakePage.querySelector( '.frm-collapse-page' );
			if ( fakeBtn && ! fakePage.classList.contains( 'frm-page-collapsed' ) ) {
				fakeBtn.click();
			}
		}

		document.querySelectorAll( '#frm-show-fields li[data-type="break"]' ).forEach( ( breakLi ) => {
			const btn = breakLi.querySelector( '.frm-collapse-page' );
			if ( btn && ! breakLi.classList.contains( 'frm-page-collapsed' ) ) {
				btn.click();
			}
		} );
	}

	function watchCanvasSelection() {
		const canvas = document.getElementById( 'frm-show-fields' );
		if ( ! canvas ) {
			return;
		}
		const observer = new MutationObserver( syncSelectionHighlight );
		observer.observe( canvas, {
			attributes: true,
			subtree: true,
			attributeFilter: [ 'class' ],
		} );
	}

	function bindBuilderHooks() {
		if ( ! window.wp || ! window.wp.hooks ) {
			return;
		}
		wp.hooks.addAction( 'frm_after_field_added_in_form_builder', 'formidable-list-view', scheduleRefresh );
		wp.hooks.addAction( 'frm_after_delete_field', 'formidable-list-view', scheduleRefresh );
		wp.hooks.addAction( 'frmShowedFieldSettings', 'formidable-list-view', ( fieldType, settingsEl ) => {
			if ( settingsEl && settingsEl.dataset && settingsEl.dataset.fid ) {
				selectedId = nodeKey( settingsEl.dataset.fid );
				updateSelectionUI();
			}
		} );
	}

	const searchInput = document.getElementById( 'flv-search-fields' );
	if ( searchInput ) {
		searchInput.addEventListener( 'input', () => {
			if ( searchTimerRef.current ) {
				clearTimeout( searchTimerRef.current );
			}
			searchTimerRef.current = setTimeout( () => {
				searchQuery = searchInput.value.trim();
				scheduleRender();
			}, 150 );
		} );
	}

	const collapsePagesInput = document.getElementById( 'flv-collapse-pages' );
	if ( collapsePagesInput ) {
		collapsePagesInput.addEventListener( 'change', () => {
			collapseToPages = collapsePagesInput.checked;
			expanded.clear();
			if ( ! collapseToPages ) {
				initDefaultExpansion();
			}
			if ( collapseToPages && syncBuilderCollapse ) {
				collapseAllBuilderPages();
			}
			scheduleRender();
		} );
	}

	const syncBuilderInput = document.getElementById( 'flv-sync-builder-collapse' );
	if ( syncBuilderInput ) {
		syncBuilderInput.addEventListener( 'change', () => {
			syncBuilderCollapse = syncBuilderInput.checked;
			if ( syncBuilderCollapse && collapseToPages ) {
				collapseAllBuilderPages();
			}
		} );
	}

	const listViewTab = document.getElementById( 'frm-list-view-tab' );
	if ( listViewTab ) {
		listViewTab.addEventListener( 'click', () => {
			setTimeout( refreshTree, 150 );
		} );
	}

	document.addEventListener( 'input', ( event ) => {
		if ( event.target && event.target.closest && event.target.closest( '#frm-rootline-titles' ) ) {
			scheduleRender();
		}
	} );

	loadInitialTree();
	watchCanvasSelection();
	bindBuilderHooks();
} )( jQuery, window.frmListView || null );
