/* Javascript for StaffGradedAssignmentXBlock2. */
function StaffGradedAssignmentXBlock2(runtime, element) {
    function xblock($, _) {
        var uploadUrl = runtime.handlerUrl(element, 'upload_assignment');
        var downloadUrl = runtime.handlerUrl(element, 'download_assignment');
        var annotatedUrl = runtime.handlerUrl(element, 'download_annotated');
        var getStaffGradingUrl = runtime.handlerUrl(element, 'get_staff_grading_data');
        var staffDownloadUrl = runtime.handlerUrl(element, 'staff_download');
        var staffAnnotatedUrl = runtime.handlerUrl(element, 'staff_download_annotated');
        var staffUploadUrl = runtime.handlerUrl(element, 'staff_upload_annotated');
        var enterGradeUrl = runtime.handlerUrl(element, 'enter_grade');
        var removeGradeUrl = runtime.handlerUrl(element, 'remove_grade');
        var template = _.template($(element).find("#sga-tmpl2").text());
        var gradingTemplate;

        function render(state) {
            // Add download urls to template context
            state.downloadUrl = downloadUrl;
            state.annotatedUrl = annotatedUrl;
            state.error = state.error ? state.error : false;

            console.log('state.pass_file: ' + state.pass_file);

            // Render template
            var content = $(element).find("#kmooc-sga-content").html(template(state));
            $('#kmooc-sga-content button').click(function () {
                $.post(uploadUrl,
                    {},
                    function (data) {
                        //console.log(data);
                        render(data);
                    }, "json");
            });
        }

        function renderStaffGrading(data) {
            $(".grade-modal").hide();

            // Add download urls to template context
            data.downloadUrl = staffDownloadUrl;
            data.annotatedUrl = staffAnnotatedUrl;

            // Render template
            $(element).find("#grade-info")
                .html(gradingTemplate(data))
                .data(data);

            // Map data to table rows
            data.assignments.map(function (assignment) {
                $(element).find("#grade-info #row-" + assignment.module_id)
                    .data(assignment);
            });

            // Set up grade entry modal
            $(element).find(".enter-grade-button")
                .leanModal({closeButton: "#enter-grade-cancel"})
                .on("click", handleGradeEntry);

            // Set up annotated file upload
            $(element).find("#grade-info .fileupload").each(function () {
                var row = $(this).parents("tr");
                var url = staffUploadUrl + "?module_id=" + row.data("module_id");
                $(this).fileupload({
                    url: url,
                    progressall: function (e, data) {
                        var percent = parseInt(data.loaded / data.total * 100, 10);
                        row.find(".upload").text("Uploading... " + percent + "%");
                    },
                    done: function (e, data) {
                        // Add a time delay so user will notice upload finishing
                        // for small files
                        setTimeout(
                            function () {
                                renderStaffGrading(data.result);
                            },
                            3000)
                    }
                });
            });
        }

        /* Click event handler for "enter grade" */
        function handleGradeEntry() {
            var row = $(this).parents("tr");
            var form = $(element).find("#enter-grade-form");
            $(element).find("#student-name").text(row.data("fullname"));
            form.find("#module_id-input").val(row.data("module_id"));
            form.find("#submission_id-input").val(row.data("submission_id"));
            form.find("#grade-input").val(row.data("score"));
            form.find("#comment-input").text(row.data("comment"));
            form.off("submit").on("submit", function (event) {
                var max_score = row.parents("#grade-info").data("max_score");
                var score = Number(form.find("#grade-input").val());
                event.preventDefault();
                if (isNaN(score)) {
                    form.find(".error").html("<br/>Grade must be a number.");
                }
                else if (score != parseInt(score)) {
                    form.find(".error").html("<br/>Grade must be an integer.");
                }
                else if (score < 0) {
                    form.find(".error").html("<br/>Grade must be positive.");
                }
                else if (score > max_score) {
                    form.find(".error").html("<br/>Maximum score is " + max_score);
                }
                else {
                    // No errors
                    $.post(enterGradeUrl, form.serialize())
                        .success(renderStaffGrading);
                }
            });
            form.find("#remove-grade").on("click", function () {
                var url = removeGradeUrl + "?module_id=" +
                    row.data("module_id") + "&student_id=" +
                    row.data("student_id");
                $.get(url).success(renderStaffGrading);
            });
            form.find("#enter-grade-cancel").on("click", function () {
                /* We're kind of stretching the limits of leanModal, here,
                 * by nesting modals one on top of the other.  One side effect
                 * is that when the enter grade modal is closed, it hides
                 * the overlay for itself and for the staff grading modal,
                 * so the overlay is no longer present to click on to close
                 * the staff grading modal.  Since leanModal uses a fade out
                 * time of 200ms to hide the overlay, our work around is to 
                 * wait 225ms and then just "click" the 'Grade Submissions'
                 * button again.  It would also probably be pretty 
                 * straightforward to submit a patch to leanModal so that it
                 * would work properly with nested modals.
                 *
                 * See: https://github.com/mitodl/edx-sga/issues/13
                 */
                setTimeout(function () {
                    $("#grade-submissions-button").click();
                }, 225);
            });
        }

        $(function ($) { // onLoad
            var block = $(element).find(".sga-block");
            var state = block.attr("data-state");
            render(JSON.parse(state));

            var is_staff = block.attr("data-staff") == "True";
            if (is_staff) {
                gradingTemplate = _.template(
                    $(element).find("#sga-grading-tmpl").text());
                block.find("#grade-submissions-button")
                    .leanModal()
                    .on("click", function () {
                        $.ajax({
                            url: getStaffGradingUrl,
                            success: renderStaffGrading
                        });
                    });
                block.find("#staff-debug-info-button")
                    .leanModal();
            }
        });
    }

    if (require === undefined) {
        /**
         * The LMS does not use require.js (although it loads it...) and
         * does not already load jquery.fileupload.  (It looks like it uses
         * jquery.ajaxfileupload instead.  But our XBlock uses
         * jquery.fileupload.
         */
        function loadjs(url) {
            $("<script>")
                .attr("type", "text/javascript")
                .attr("src", url)
                .appendTo(element);
        }

        loadjs("/static/js/vendor/jQuery-File-Upload/js/jquery.iframe-transport.js");
        loadjs("/static/js/vendor/jQuery-File-Upload/js/jquery.fileupload.js");
        xblock($, _);
    }
    else {
        /**
         * Studio, on the other hand, uses require.js and already knows about
         * jquery.fileupload.
         */
        require(["jquery", "underscore", "jquery.fileupload"], xblock);
    }
}
