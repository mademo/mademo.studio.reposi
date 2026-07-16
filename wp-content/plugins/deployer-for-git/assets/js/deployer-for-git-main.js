'use strict';

var j = jQuery.noConflict();

j(function() {
	init_provider_changed_listener();
	init_private_repo_changed_listener();
	init_dashboard_listenes();
	init_log_textarea_scroll();
});

function init_provider_changed_listener() {
	j('.dfg_install_package_form').on('change', 'select[name="provider_type"]', function(e) {
		const selected_provider_name = e.target.value;

		// Repo URL descriptions
		j(`.dfg_install_package_form .dfg_repo_url_description`).addClass('dfg_hidden');
		j(`.dfg_install_package_form #${selected_provider_name}-repo-url-description`).removeClass('dfg_hidden');

		// Show "is private repository" row
		j('.dfg_is_private_repository_row').removeClass('dfg_hidden');

		// Refresh private repo fields
		refresh_private_repo_fields();

		// Update help link URL
		j('.dfg_help_link_row').removeClass('dfg_hidden');
		let help_url = '';
		switch (selected_provider_name) {
			case 'github':
				help_url = 'https://deployer-for-git.com/knowledge-base/category/faqs/github/';
				break;
			case 'bitbucket':
				help_url = 'https://deployer-for-git.com/knowledge-base/category/faqs/bitbucket/';
				break;
			case 'gitlab':
				help_url = 'https://deployer-for-git.com/knowledge-base/category/faqs/gitlab/';
				break;
			case 'gitea':
				help_url = 'https://deployer-for-git.com/knowledge-base/category/faqs/gitea/';
				break;
			default:
				help_url = 'https://deployer-for-git.com/knowledge-base/';
		}

		j('#dfg_install_package_form_repo_help_link').attr('href', help_url);
	});
}

function init_private_repo_changed_listener() {
	j('.dfg_install_package_form').on('change', 'input[name="is_private_repository"]', function(e) {
		refresh_private_repo_fields();
	});
}

function refresh_private_repo_fields() {
	const is_checked = j('.dfg_install_package_form input[name="is_private_repository"]').is(':checked');
	const provider_type = j('.dfg_install_package_form select[name="provider_type"]').val();

	j(`.dfg_install_package_form .dfg_username_row,
		 .dfg_install_package_form .dfg_password_row,
		 .dfg_install_package_form .dfg_access_token_row,
		 .dfg_install_package_form .dfg_access_token_description`).addClass('dfg_hidden');

	if (is_checked) {
		if (provider_type === 'github') {
			j('.dfg_install_package_form .dfg_access_token_row').removeClass('dfg_hidden');
			j(`.dfg_install_package_form #github-access-token-description`).removeClass('dfg_hidden');
		}

		if (provider_type === 'bitbucket') {
			j(`.dfg_install_package_form .dfg_username_row,
				 .dfg_install_package_form .dfg_password_row`).removeClass('dfg_hidden');
		}

		if (provider_type === 'gitlab') {
			j('.dfg_install_package_form .dfg_access_token_row').removeClass('dfg_hidden');
			j(`.dfg_install_package_form #gitlab-access-token-description`).removeClass('dfg_hidden');
		}

		if (provider_type === 'gitea') {
			j('.dfg_install_package_form .dfg_access_token_row').removeClass('dfg_hidden');
			j(`.dfg_install_package_form #gitea-access-token-description`).removeClass('dfg_hidden');
		}
	}
}

function init_dashboard_listenes() {
	j('.dfg_package_boxes a[data-copy-url-btn]').on('click', function(e) {
		e.preventDefault();
		const url = j(this).data('copy-url-btn');
		let $text_el = j(this).find('.text');
		navigator.clipboard.writeText(url).then(function() {
			$text_el.text( dfg.copied_url_label );
			setTimeout(function() {
				$text_el.text( dfg.copy_url_label );
			}, 2000);
		});
	});

	j('.dfg_package_boxes a[data-show-ptd-btn]').on('click', function(e) {
		e.preventDefault();

		let $package_box_action = j(this).parent().find('.dfg_package_box_action');
		$package_box_action.toggleClass('visible');
	});

	j('.dfg_package_boxes button[data-unlink-btn]').on('click', function(e) {
		e.preventDefault();

		if ( ! confirm( dfg.unlink_confirm_label ) ) {
			return;
		}

		var $btn = j(this);
		var slug = $btn.data('unlink-slug');
		var type = $btn.data('unlink-type');
		var $package_box = $btn.closest('.dfg_package_box');

		$btn.attr('disabled', true);

		j.ajax({
			url: dfg.ajax_url,
			type: 'POST',
			dataType: 'json',
			data: {
				action: 'dfg_unlink_package',
				nonce: dfg.unlink_nonce,
				slug: slug,
				type: type
			}
		})
		.done(function(response) {
			if (response.success) {
				$package_box.fadeOut(300, function() {
					j(this).remove();
				});
			} else {
				alert( response.data.message || dfg.error_label );
				$btn.removeAttr('disabled');
			}
		})
		.fail(function() {
			alert( dfg.error_label );
			$btn.removeAttr('disabled');
		});
	});

	j('.dfg_package_boxes button[data-trigger-ptd-btn]').on('click', function(e) {
		e.preventDefault();
		const endpoint_url = j(this).data('trigger-ptd-btn');
		let $parent_el = j(this);
		let $parent_text_el = j(this).find('.text');

		j.ajax({
			url: endpoint_url,
			type: 'GET',
			dataType: 'json',
			beforeSend: function() {
				$parent_el.addClass( 'loading' );
				$parent_el.attr( 'disabled', true );

				$parent_text_el.text( dfg.updating_now_label );
			}
		})
		.done(function(response) {
			if (response.success) {
				$parent_text_el.text( dfg.update_completed_label );

				setTimeout(function() {
					if ( $parent_el.data('package-type') === 'theme') {
						$parent_text_el.text( dfg.update_theme_label );
					} else {
						$parent_text_el.text( dfg.update_plugin_label );
					}
					$parent_el.removeAttr( 'disabled' );
				}, 2000);
			} else {
				$parent_text_el.text( dfg.error_label );
			}

			$parent_el.removeClass( 'loading' );
		});
	});
}

function init_log_textarea_scroll() {
	var $textarea = j('.dfg_log_textarea');
	if ($textarea.length) {
		$textarea.each(function() {
			this.scrollTop = this.scrollHeight;
		});
	}
}